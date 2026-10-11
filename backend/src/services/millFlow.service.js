const { prisma } = require('../config/prisma');

/**
 * Mill Flow Service — Streamlined Textile Manufacturing Pipeline
 * 1. Buyer Order & Yarn BOM Requirement Check
 * 2. Production Start & Instant Yarn Inventory Deduction
 * 3. Quality Inspection (Good Fabric -> Dispatch vs Defective -> Wasted Yarn & Rerun)
 * 4. Dispatch & Delivery
 * 5. Owner Financial Statement (Fabric Revenue - Yarn Cost = Final Profit/Loss)
 */

/**
 * Get comprehensive snapshot of the entire mill flow pipeline.
 */
async function getMillPipeline(filters = {}) {
  // 1. Raw material yarns in stock
  const yarns = await prisma.product.findMany({
    where: { type: 'RAW_MATERIAL' },
    orderBy: { name: 'asc' }
  });

  // 2. Finished goods fabrics
  const fabrics = await prisma.product.findMany({
    where: { type: 'FINISHED_GOODS' },
    orderBy: { name: 'asc' }
  });

  // 3. Approved / trusted suppliers
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });

  // 4. Buyers
  const buyers = await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });

  // 5. Active buyer orders with linked production orders & items
  const salesOrders = await prisma.salesOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      customer: true,
      items: {
        include: { product: true }
      },
      productionOrders: {
        include: {
          machine: true,
          materialConsumptions: { include: { rawMaterial: true } },
          inspections: { include: { defectRecords: true } },
          stageLogs: {
            include: { machine: true }
          }
        }
      },
      dispatchRecords: {
        orderBy: { createdAt: 'desc' }
      },
      invoices: true
    }
  });

  // Format pipeline orders with calculated Yarn BOM status
  const orders = salesOrders.map((so) => {
    const item = so.items[0] || {};
    const fabric = item.product || fabrics.find((f) => f.id === item.productId) || {};
    const orderQty = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const totalValue = orderQty * unitPrice;

    // Dynamic Yarn Consumption Recipe: from sales order notes or fabric specifications
    let yarnRatio = 1.25;
    let fabricSpec = {};
    if (fabric.specifications) {
      try {
        fabricSpec = JSON.parse(fabric.specifications);
        if (fabricSpec.yarnRatio) yarnRatio = parseFloat(fabricSpec.yarnRatio) || 1.25;
      } catch {
        // ignore
      }
    }
    if (so.notes && so.notes.includes('yarnRatio:')) {
      const match = so.notes.match(/yarnRatio:([\d.]+)/);
      if (match) yarnRatio = parseFloat(match[1]) || yarnRatio;
    }

    const neededYarnQty = Math.round(orderQty * yarnRatio * 100) / 100;

    // Pick matching yarn from inventory (matching fabric recipe or order note)
    let matchedYarn = null;
    if (so.notes && so.notes.includes('yarnId:')) {
      const match = so.notes.match(/yarnId:([a-zA-Z0-9_-]+)/);
      if (match) matchedYarn = yarns.find((y) => y.id === match[1]);
    }
    if (!matchedYarn && fabricSpec.yarnCode) {
      matchedYarn = yarns.find((y) => y.code === fabricSpec.yarnCode);
    }
    if (!matchedYarn) {
      matchedYarn = yarns[0] || null;
    }

    const availableYarnQty = matchedYarn ? matchedYarn.currentStock : 0;
    const hasEnoughYarn = availableYarnQty >= neededYarnQty;
    const shortageQty = Math.max(0, neededYarnQty - availableYarnQty);

    // Linked production runs
    const productionRuns = so.productionOrders || [];
    const latestRun = productionRuns[0] || null;
    const latestInspection = latestRun?.inspections?.[0] || null;

    // Check if fabric has been dispatched & delivered
    const hasDispatch =
      (so.dispatchRecords && so.dispatchRecords.length > 0) ||
      so.status === 'COMPLETED' ||
      so.status === 'DISPATCHED' ||
      so.status === 'DELIVERED';

    let step = 1;
    let stepLabel = 'Buyer Order & Yarn Check';
    let isDefective = false;

    if (hasDispatch) {
      step = 4;
      stepLabel = 'Dispatched & Delivered to Buyer';
    } else if (latestInspection?.status === 'PASSED') {
      step = 4;
      stepLabel = 'Quality Passed — Ready for Dispatch';
    } else if (latestInspection?.status === 'REJECTED') {
      step = 3;
      stepLabel = 'Quality Rejected — Defective Fabric';
      isDefective = true;
    } else if (latestRun && latestRun.status === 'IN_PRODUCTION') {
      step = 2;
      stepLabel = 'In Production (Yarn Deducted)';
    } else if (so.status === 'IN_PRODUCTION') {
      step = 2;
      stepLabel = 'In Production';
    } else {
      step = 1;
      stepLabel = hasEnoughYarn ? 'Yarn in Stock — Ready to Produce' : 'Yarn Shortage — Order Needed';
    }

    const latestDispatch = so.dispatchRecords?.[0] || null;

    return {
      id: so.id,
      orderNumber: so.orderNumber,
      createdAt: so.createdAt,
      status: hasDispatch ? 'DELIVERED' : so.status,
      isDispatched: hasDispatch,
      isDelivered: hasDispatch,
      customer: so.customer,
      fabric: {
        id: fabric.id,
        name: fabric.name || item.fabricType || 'Finished Fabric',
        code: fabric.code || 'FAB-01',
        unit: fabric.unit || 'METER',
        quantity: orderQty,
        unitPrice: unitPrice,
        totalValue: totalValue
      },
      yarnRequirement: {
        yarnId: matchedYarn?.id,
        yarnName: matchedYarn?.name || 'Raw Yarn',
        yarnCode: matchedYarn?.code || 'YRN-01',
        unit: matchedYarn?.unit || 'KG',
        ratio: yarnRatio,
        neededQuantity: neededYarnQty,
        availableQuantity: availableYarnQty,
        shortageQuantity: shortageQty,
        hasEnoughYarn
      },
      step,
      stepLabel,
      isDefective,
      productionRun: latestRun
        ? {
            id: latestRun.id,
            orderNumber: latestRun.orderNumber,
            stage: latestRun.stage,
            status: latestRun.status,
            targetQuantity: latestRun.targetQuantity,
            producedQuantity: latestRun.producedQuantity,
            wasteQuantity: latestRun.wasteQuantity,
            machineId: latestRun.machineId,
            machine: latestRun.machine,
            stageLogs: latestRun.stageLogs || [],
            yarnDeducted: latestRun.materialConsumptions.reduce((sum, m) => sum + (m.actualQuantity || 0), 0)
          }
        : null,
      inspection: latestInspection
        ? {
            id: latestInspection.id,
            status: latestInspection.status,
            rollNumber: latestInspection.rollNumber,
            metersInspected: latestInspection.metersInspected,
            defects: latestInspection.defectRecords
          }
        : null,
      dispatch: latestDispatch,
      dispatches: so.dispatchRecords || []
    };
  });

  const stageMachines = await getStageMachines();

  return {
    yarns,
    fabrics,
    suppliers,
    buyers,
    orders,
    stageMachines
  };
}

/**
 * 1. Create a buyer order with fixed Yarn BOM requirement.
 */
async function createBuyerOrderWithYarnCheck(data) {
  const {
    buyerId,
    newBuyer,
    fabricId,
    quantity,
    unitPrice,
    yarnId,
    yarnRatio = 5.0,
    deliveryDeadline,
    notes
  } = data;

  const orderQty = parseFloat(quantity);
  if (isNaN(orderQty) || orderQty <= 0) {
    const err = new Error('Order quantity must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  const price = parseFloat(unitPrice);
  if (isNaN(price) || price < 0) {
    const err = new Error('Unit price must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or create customer
    let customerId = buyerId;
    if (!customerId && newBuyer) {
      if (!newBuyer.name || !newBuyer.phone) {
        const err = new Error('Buyer name and phone are required');
        err.statusCode = 400;
        throw err;
      }
      const createdCustomer = await tx.customer.create({
        data: {
          name: newBuyer.name.trim(),
          company: newBuyer.company ? newBuyer.company.trim() : newBuyer.name.trim(),
          phone: String(newBuyer.phone).replace(/\D/g, '').slice(-10),
          email: newBuyer.email ? newBuyer.email.trim() : null,
          address: newBuyer.address ? newBuyer.address.trim() : null
        }
      });
      customerId = createdCustomer.id;
    }

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      const err = new Error('Buyer not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Resolve Fabric
    const fabric = await tx.product.findUnique({ where: { id: fabricId } });
    if (!fabric) {
      const err = new Error('Fabric product not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Resolve Yarn & Dynamic Conversion Recipe
    let yarnProduct = null;
    let ratio = parseFloat(yarnRatio);

    if (!yarnId && fabric.specifications) {
      try {
        const spec = JSON.parse(fabric.specifications);
        if (spec.yarnCode) {
          yarnProduct = await tx.product.findUnique({ where: { code: spec.yarnCode } });
        }
        if ((isNaN(ratio) || ratio <= 0) && spec.yarnRatio) {
          ratio = parseFloat(spec.yarnRatio);
        }
      } catch {
        // ignore
      }
    }

    if (yarnId) {
      yarnProduct = await tx.product.findUnique({ where: { id: yarnId } });
    }
    if (!yarnProduct) {
      yarnProduct = await tx.product.findFirst({ where: { type: 'RAW_MATERIAL' } });
    }
    if (!yarnProduct) {
      const err = new Error('No raw material yarn available in system');
      err.statusCode = 400;
      throw err;
    }

    if (isNaN(ratio) || ratio <= 0) {
      ratio = 1.25;
    }

    const neededYarn = Math.round(orderQty * ratio * 100) / 100;
    const availableYarn = yarnProduct.currentStock;
    const hasEnoughYarn = availableYarn >= neededYarn;
    const shortage = Math.max(0, Math.round((neededYarn - availableYarn) * 100) / 100);

    // 4. Generate order number
    const year = new Date().getFullYear();
    const count = await tx.salesOrder.count();
    const orderNumber = `SO-${year}-${String(count + 1).padStart(4, '0')}`;

    // Deadline
    let deadline = new Date();
    if (deliveryDeadline) {
      deadline = new Date(deliveryDeadline);
    } else {
      deadline.setDate(deadline.getDate() + 7); // Default 7 days
    }

    const orderNotes = `yarnRatio:${ratio} | yarnId:${yarnProduct.id} | ${notes || 'Mill buyer order'}`;

    // 5. Create SalesOrder
    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: 'CONFIRMED',
        deliveryDeadline: deadline,
        notes: orderNotes,
        items: {
          create: [
            {
              productId: fabric.id,
              fabricType: fabric.name,
              color: fabric.color || 'Standard',
              quantity: orderQty,
              unitPrice: price,
              totalPrice: orderQty * price
            }
          ]
        }
      },
      include: {
        customer: true,
        items: true
      }
    });

    return {
      salesOrder,
      yarnRequirement: {
        yarnId: yarnProduct.id,
        yarnName: yarnProduct.name,
        yarnCode: yarnProduct.code,
        ratio,
        neededQuantity: neededYarn,
        availableQuantity: availableYarn,
        shortageQuantity: shortage,
        hasEnoughYarn
      }
    };
  });
}

/**
 * 2. Order raw material Yarn from an existing or on-the-fly created Supplier.
 * Optionally auto-receives it into inventory so production can start immediately.
 */
async function orderYarnFromSupplier(data) {
  const {
    supplierId,
    newSupplier,
    yarnId,
    quantity,
    unitPrice = 0,
    autoReceive = true,
    notes
  } = data;

  const shouldAutoReceive = autoReceive !== false && autoReceive !== 'false';

  const orderQty = parseFloat(quantity);
  if (isNaN(orderQty) || orderQty <= 0) {
    const err = new Error('Yarn order quantity must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const price = parseFloat(unitPrice) || 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or create Supplier
    let resolvedSupplierId = supplierId;
    if (!resolvedSupplierId && newSupplier) {
      if (!newSupplier.name) {
        const err = new Error('Supplier name is required to add to trusted list');
        err.statusCode = 400;
        throw err;
      }
      const createdSupplier = await tx.supplier.create({
        data: {
          name: newSupplier.name.trim(),
          contactPerson: newSupplier.contactPerson ? newSupplier.contactPerson.trim() : null,
          phone: newSupplier.phone ? String(newSupplier.phone).trim() : null,
          email: newSupplier.email ? newSupplier.email.trim() : null,
          yarnTypesSupplied: newSupplier.yarnTypesSupplied || 'Raw Cotton / Spun Yarn'
        }
      });
      resolvedSupplierId = createdSupplier.id;
    }

    const supplier = await tx.supplier.findUnique({ where: { id: resolvedSupplierId } });
    if (!supplier) {
      const err = new Error('Supplier not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Resolve Yarn Product
    const yarn = await tx.product.findUnique({ where: { id: yarnId } });
    if (!yarn || yarn.type !== 'RAW_MATERIAL') {
      const err = new Error('Invalid raw material yarn specified');
      err.statusCode = 404;
      throw err;
    }

    // 3. Create Purchase Order
    const year = new Date().getFullYear();
    const count = await tx.purchaseOrder.count();
    const orderNumber = `PO-YRN-${year}-${String(count + 1).padStart(4, '0')}`;

    const po = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: supplier.id,
        status: shouldAutoReceive ? 'RECEIVED' : 'ORDERED',
        totalAmount: orderQty * price,
        notes: notes || `Yarn restock: ${orderQty} ${yarn.unit}`,
        items: {
          create: [
            {
              productId: yarn.id,
              orderedQty: orderQty,
              receivedQty: shouldAutoReceive ? orderQty : 0.0,
              unitPrice: price,
              totalPrice: orderQty * price
            }
          ]
        }
      },
      include: {
        supplier: true,
        items: true
      }
    });

    let updatedYarnStock = yarn.currentStock;

    // 4. If autoReceive is true, atomically increase inventory stock
    if (shouldAutoReceive) {
      const updatedProduct = await tx.product.update({
        where: { id: yarn.id },
        data: { currentStock: { increment: orderQty } }
      });
      updatedYarnStock = updatedProduct.currentStock;

      const invTx = await tx.inventoryTransaction.create({
        data: {
          productId: yarn.id,
          quantity: orderQty,
          balanceAfter: updatedYarnStock,
          type: 'PURCHASE_RECEIPT',
          referenceNumber: po.orderNumber,
          notes: `Received ${orderQty} ${yarn.unit} from ${supplier.name}`,
          performedBy: 'Yarn Inward Gate'
        }
      });

      // Also create an inward SupplierBill record for owner accounting ledger
      try {
        await tx.supplierBill.create({
          data: {
            billNumber: `BILL-${po.orderNumber}`,
            supplierId: supplier.id,
            purchaseOrderId: po.id,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            status: 'PAID',
            totalAmount: orderQty * price,
            paidAmount: orderQty * price,
            balanceDue: 0,
            notes: `Auto-recorded yarn purchase bill from ${supplier.name}`
          }
        });
      } catch {
        // Accounting table is optional/tolerant
      }
    }

    return {
      purchaseOrder: po,
      supplier,
      yarn: {
        id: yarn.id,
        name: yarn.name,
        code: yarn.code,
        previousStock: yarn.currentStock,
        newStock: updatedYarnStock,
        unit: yarn.unit
      }
    };
  });
}

/**
 * 3. Start Production & Deduct Yarn from Inventory immediately.
 * In both Good and Defective cases, Yarn is reduced from inventory right away.
 */
async function startProductionAndDeductYarn(data) {
  const {
    salesOrderId,
    targetQuantity,
    yarnId,
    yarnQuantity,
    machineId
  } = data;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Sales Order
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: { include: { product: true } } }
    });

    if (!salesOrder) {
      const err = new Error('Sales order not found');
      err.statusCode = 404;
      throw err;
    }

    const item = salesOrder.items[0];
    const fabricProduct = item?.product;
    if (!fabricProduct) {
      const err = new Error('No fabric product associated with this order');
      err.statusCode = 400;
      throw err;
    }

    // 2. Resolve Yarn
    let yarnProduct = null;
    if (yarnId) {
      yarnProduct = await tx.product.findUnique({ where: { id: yarnId } });
    }
    if (!yarnProduct) {
      yarnProduct = await tx.product.findFirst({ where: { type: 'RAW_MATERIAL' } });
    }
    if (!yarnProduct) {
      const err = new Error('Raw material yarn not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Compute yarn quantity
    const targetQty = parseFloat(targetQuantity) || item.quantity;
    let yarnQty = parseFloat(yarnQuantity);
    if (isNaN(yarnQty) || yarnQty <= 0) {
      yarnQty = targetQty * 5.0; // Default 5 units yarn per unit fabric
    }

    // 4. Check available stock
    if (yarnProduct.currentStock < yarnQty) {
      const err = new Error(
        `Insufficient yarn stock. Required: ${yarnQty} ${yarnProduct.unit}, Available: ${yarnProduct.currentStock} ${yarnProduct.unit}. Please order yarn from supplier first.`
      );
      err.statusCode = 409;
      throw err;
    }

    // 5. Deduct Yarn from Inventory ATOMICALLY
    const invTx = await tx.inventoryTransaction.create({
      data: {
        productId: yarnProduct.id,
        quantity: -yarnQty,
        type: 'PRODUCTION_CONSUMPTION',
        referenceNumber: salesOrder.orderNumber,
        notes: `Consumed ${yarnQty} ${yarnProduct.unit} for production of ${salesOrder.orderNumber}`,
        performedBy: 'Mill Loom / Weaving'
      }
    });

    const updatedYarn = await tx.product.update({
      where: { id: yarnProduct.id },
      data: { currentStock: { decrement: yarnQty } }
    });

    // 6. Resolve Machine for Spinning (Step 1 of 3-step manufacturing)
    let spinMachine = null;
    if (machineId) {
      spinMachine = await tx.machine.findUnique({ where: { id: machineId } });
    }
    if (!spinMachine) {
      spinMachine = await tx.machine.findFirst({
        where: { type: 'SPINNING', status: { in: ['RUNNING', 'IDLE'] } },
        orderBy: { code: 'asc' }
      });
    }

    if (spinMachine && spinMachine.status === 'IDLE') {
      await tx.machine.update({
        where: { id: spinMachine.id },
        data: { status: 'RUNNING' }
      });
    }

    const year = new Date().getFullYear();
    const count = await tx.productionOrder.count();
    const orderNumber = `PROD-${year}-${String(count + 1).padStart(4, '0')}`;

    const prodOrder = await tx.productionOrder.create({
      data: {
        orderNumber,
        salesOrderId: salesOrder.id,
        productId: fabricProduct.id,
        machineId: spinMachine?.id || null,
        stage: 'SPINNING',
        status: 'IN_PROGRESS',
        targetQuantity: targetQty,
        producedQuantity: 0.0,
        startDate: new Date(),
        materialConsumptions: {
          create: [
            {
              rawMaterialId: yarnProduct.id,
              stage: 'SPINNING',
              plannedQuantity: yarnQty,
              actualQuantity: yarnQty,
              unit: yarnProduct.unit,
              isDeducted: true,
              inventoryTransactionId: invTx.id
            }
          ]
        },
        stageLogs: {
          create: [
            {
              stage: 'SPINNING',
              machineId: spinMachine?.id || null,
              inputQuantity: yarnQty,
              outputQuantity: 0.0,
              wasteQuantity: 0.0,
              status: 'IN_PROGRESS',
              startedAt: new Date()
            }
          ]
        }
      },
      include: {
        materialConsumptions: true,
        stageLogs: { include: { machine: true } },
        machine: true
      }
    });

    // 7. Update Sales Order status
    await tx.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: 'IN_PRODUCTION' }
    });

    return {
      productionOrder: prodOrder,
      deductedYarn: {
        yarnId: yarnProduct.id,
        name: yarnProduct.name,
        quantityDeducted: yarnQty,
        remainingStock: updatedYarn.currentStock,
        unit: yarnProduct.unit
      }
    };
  });
}

/**
 * 4. Record Quality Check:
 * - GOOD: Fabric roll produced, advances to Ready for Dispatch.
 * - DEFECTIVE: Fabric rejected. Yarn already deducted is wasted ($0 revenue).
 *   Allows 1-click rerun for the buyer's order.
 */
async function recordQualityInspection(data) {
  const {
    productionOrderId,
    outcome, // 'GOOD' or 'DEFECTIVE'
    metersInspected,
    defectNotes,
    defectType = 'OTHER',
    rerunIfDefective = false
  } = data;

  const isGood = outcome === 'GOOD';

  return await prisma.$transaction(async (tx) => {
    let prodOrder = null;
    if (productionOrderId) {
      prodOrder = await tx.productionOrder.findUnique({
        where: { id: productionOrderId },
        include: {
          salesOrder: { include: { customer: true, items: true } },
          product: true,
          materialConsumptions: { include: { rawMaterial: true } },
          stageLogs: true
        }
      });
    }

    if (!prodOrder && (data.salesOrderId || productionOrderId)) {
      prodOrder = await tx.productionOrder.findFirst({
        where: { salesOrderId: data.salesOrderId || productionOrderId },
        orderBy: { createdAt: 'desc' },
        include: {
          salesOrder: { include: { customer: true, items: true } },
          product: true,
          materialConsumptions: { include: { rawMaterial: true } },
          stageLogs: true
        }
      });
    }

    if (!prodOrder) {
      const err = new Error('Production order not found');
      err.statusCode = 404;
      throw err;
    }

    const meters = parseFloat(metersInspected) || prodOrder.targetQuantity;
    const rollNumber = `ROLL-${prodOrder.orderNumber}-${Date.now().toString().slice(-4)}`;

    // 1. Create Quality Inspection record
    const inspection = await tx.qualityInspection.create({
      data: {
        productionOrderId: prodOrder.id,
        rollNumber,
        metersInspected: meters,
        status: isGood ? 'PASSED' : 'REJECTED',
        inspectorName: 'Quality Lead',
        inspectedAt: new Date(),
        notes: isGood ? 'Passed Quality Check — Fabric Approved' : `Defect: ${defectNotes || 'Uneven weave / hole defect'}`
      }
    });

    if (!isGood) {
      // Create defect record
      await tx.defectRecord.create({
        data: {
          inspectionId: inspection.id,
          defectType: defectType || 'UNEVEN_WEAVING',
          severity: 'MAJOR',
          location: 'Center of roll',
          notes: defectNotes || 'Defective fabric roll — yarn wasted'
        }
      });
    }

    // 2. Close out active stage logs
    const activeLog = prodOrder.stageLogs.find((l) => l.status === 'IN_PROGRESS');
    if (activeLog) {
      await tx.productionStageLog.update({
        where: { id: activeLog.id },
        data: {
          status: 'COMPLETED',
          outputQuantity: isGood ? meters : 0.0,
          wasteQuantity: isGood ? 0.0 : meters,
          completedAt: new Date(),
          notes: isGood ? 'Finished good fabric' : 'Defective output — yarn wasted'
        }
      });
    }

    // 3. Update Production Order
    await tx.productionOrder.update({
      where: { id: prodOrder.id },
      data: {
        stage: 'FINISHING',
        status: isGood ? 'COMPLETED' : 'PAUSED',
        producedQuantity: isGood ? meters : 0.0,
        endDate: new Date()
      }
    });

    // 4. Update Sales Order & Finished Goods Inventory
    let rerunOrder = null;
    if (prodOrder.salesOrder) {
      if (isGood) {
        // Fabric is ready for dispatch
        await tx.salesOrder.update({
          where: { id: prodOrder.salesOrder.id },
          data: { status: 'READY_TO_SHIP' }
        });

        // Increment finished goods stock
        await tx.product.update({
          where: { id: prodOrder.productId },
          data: { currentStock: { increment: meters } }
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: prodOrder.productId,
            type: 'PRODUCTION_OUTPUT',
            quantity: meters,
            referenceNumber: prodOrder.orderNumber,
            notes: `Passed QC inspection. Added ${meters} ${prodOrder.product.unit} to warehouse stock.`,
            performedBy: 'QC Lead'
          }
        });
      } else {
        // Fabric is defective. Yarn is wasted. No revenue.
        await tx.salesOrder.update({
          where: { id: prodOrder.salesOrder.id },
          data: { status: 'CONFIRMED' } // Returns to pending production
        });

        // If rerun requested, prepare new production order
        if (rerunIfDefective) {
          const year = new Date().getFullYear();
          const count = await tx.productionOrder.count();
          rerunOrder = await tx.productionOrder.create({
            data: {
              orderNumber: `PROD-RERUN-${year}-${String(count + 1).padStart(4, '0')}`,
              salesOrderId: prodOrder.salesOrder.id,
              productId: prodOrder.productId,
              stage: 'WEAVING',
              status: 'PLANNED',
              targetQuantity: prodOrder.targetQuantity,
              producedQuantity: 0.0
            }
          });
        }
      }
    }

    return {
      inspection,
      outcome: isGood ? 'GOOD' : 'DEFECTIVE',
      fabricStatus: isGood ? 'APPROVED_FOR_DISPATCH' : 'REJECTED_WASTE',
      yarnWastedNotice: !isGood
        ? 'Raw yarn was deducted from inventory during production. Mill earns ₹0 for this wasted yarn.'
        : null,
      rerunOrder
    };
  });
}

/**
 * 5. Dispatch and Deliver approved fabric to Buyer.
 * Once delivered, revenue is recorded in accounting.
 */
async function dispatchFabricToBuyer(data) {
  const salesOrderId = data.salesOrderId || data.id;
  const {
    vehicleNumber = 'MH-12-TX-4401',
    driverName = 'Rajesh Kumar',
    driverPhone = '9876543210',
    destination = 'Buyer Warehouse'
  } = data;

  if (!salesOrderId) {
    const err = new Error('Sales order ID is required for dispatch');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        items: { include: { product: true } },
        dispatchRecords: true
      }
    });

    if (!salesOrder) {
      const err = new Error('Sales order not found');
      err.statusCode = 404;
      throw err;
    }

    if (salesOrder.status === 'COMPLETED' || salesOrder.status === 'DELIVERED') {
      const err = new Error('Order is already dispatched and delivered');
      err.statusCode = 409;
      throw err;
    }

    const item = salesOrder.items[0];
    const qty = item?.quantity || 1;
    const unitPrice = item?.unitPrice || 0;
    const totalAmount = qty * unitPrice;
    const fabricProduct = item?.product;

    // 1. Create Dispatch Record
    const year = new Date().getFullYear();
    const count = await tx.dispatchRecord.count();
    const dispatchNumber = `DSP-${year}-${String(count + 1).padStart(4, '0')}`;

    const dispatch = await tx.dispatchRecord.create({
      data: {
        dispatchNumber,
        salesOrderId: salesOrder.id,
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        destination: destination.trim(),
        dispatchedRollCount: 1,
        status: 'DELIVERED',
        dispatchedAt: new Date()
      }
    });

    // Deduct finished fabric stock upon dispatch
    if (fabricProduct) {
      const remainingStock = Math.max(0, fabricProduct.currentStock - qty);
      await tx.product.update({
        where: { id: fabricProduct.id },
        data: { currentStock: remainingStock }
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: fabricProduct.id,
          type: 'DISPATCH',
          quantity: -qty,
          balanceAfter: remainingStock,
          referenceNumber: dispatchNumber,
          notes: `Dispatched ${qty} ${fabricProduct.unit} to buyer ${salesOrder.customer.name}`,
          performedBy: 'Logistics Gate Pass'
        }
      });
    }

    // 2. Mark Sales Order as COMPLETED
    await tx.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: 'COMPLETED' }
    });

    // 3. Generate Commercial Invoice and record sales payment so revenue appears in Owner Financials
    const invCount = await tx.invoice.count();
    const invoiceNumber = `INV-${year}-${String(invCount + 1).padStart(4, '0')}`;

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        salesOrderId: salesOrder.id,
        customerId: salesOrder.customerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        status: 'PAID',
        subtotal: totalAmount,
        taxAmount: 0,
        totalAmount: totalAmount,
        paidAmount: totalAmount,
        balanceDue: 0,
        notes: `Delivered fabric payment for ${salesOrder.orderNumber}`
      }
    });

    const payCount = await tx.buyerPayment.count();
    const paymentNumber = `PAY-${year}-${String(payCount + 1).padStart(4, '0')}`;

    // Also record buyer payment receipt
    await tx.buyerPayment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        paymentDate: new Date(),
        amount: totalAmount,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: `REC-${salesOrder.orderNumber}`,
        notes: `Full payment received from ${salesOrder.customer.name}`
      }
    });

    return {
      dispatch,
      salesOrderNumber: salesOrder.orderNumber,
      buyer: salesOrder.customer.name,
      revenueGenerated: totalAmount,
      invoiceNumber: invoice.invoiceNumber
    };
  });
}

/**
 * 6. Owner Monthly Financial Statement & Transactions:
 * - Total Revenue from Selling Finished Fabric to Buyers
 * - Total Spent on Raw Material Yarn
 * - Cost of Defective Wasted Yarn ($0 Revenue)
 * - Final Net Profit or Loss = Fabric Revenue - Yarn Cost
 * - Chronological list of monthly transactions
 */
async function getOwnerMonthlyFinancials(filters = {}) {
  const { month } = filters; // Format 'YYYY-MM'

  let dateFilter = {};
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
    dateFilter = { gte: start, lte: end };
  }

  // 1. Fabric Sales Invoices (Revenue earned from buyers)
  const invoices = await prisma.invoice.findMany({
    where: dateFilter.gte ? { issueDate: dateFilter } : {},
    include: { customer: true, salesOrder: true },
    orderBy: { issueDate: 'desc' }
  });

  const totalFabricSalesRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.totalAmount || 0), 0);

  // 2. Yarn Purchases & Bills (Money spent on raw material yarn)
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: dateFilter.gte ? { createdAt: dateFilter } : {},
    include: {
      supplier: true,
      items: { include: { product: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const totalSpentOnYarn = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

  // 3. Defective / Wasted Yarn calculations
  const defectiveInspections = await prisma.qualityInspection.findMany({
    where: {
      status: 'REJECTED',
      ...(dateFilter.gte ? { inspectedAt: dateFilter } : {})
    },
    include: {
      productionOrder: {
        include: {
          materialConsumptions: { include: { rawMaterial: true } },
          salesOrder: true
        }
      }
    }
  });

  let totalWastedYarnQuantity = 0;
  let estimatedWastedYarnCost = 0;

  for (const insp of defectiveInspections) {
    const consumptions = insp.productionOrder?.materialConsumptions || [];
    for (const c of consumptions) {
      const qty = c.actualQuantity || c.plannedQuantity || 0;
      const unitPrice = c.rawMaterial?.unitPrice || 150; // Fallback ~₹150/kg
      totalWastedYarnQuantity += qty;
      estimatedWastedYarnCost += qty * unitPrice;
    }
  }

  // 4. Net Profit or Loss
  const netProfitOrLoss = totalFabricSalesRevenue - totalSpentOnYarn;
  const isProfitable = netProfitOrLoss >= 0;

  // 5. Monthly Transactions Ledger (Chronological feed)
  const transactions = [];

  // Add fabric sales
  for (const inv of invoices) {
    transactions.push({
      id: `SALE-${inv.id}`,
      date: inv.issueDate,
      type: 'FABRIC_SALE',
      category: 'Inflow (Buyer Payment)',
      title: `Fabric Sale to ${inv.customer?.name || 'Buyer'}`,
      reference: inv.invoiceNumber,
      orderNumber: inv.salesOrder?.orderNumber || 'SO',
      amount: inv.paidAmount || inv.totalAmount,
      isPositive: true,
      status: inv.status
    });
  }

  // Add yarn purchases
  for (const po of purchaseOrders) {
    transactions.push({
      id: `PURCHASE-${po.id}`,
      date: po.createdAt,
      type: 'YARN_PURCHASE',
      category: 'Outflow (Supplier Payment)',
      title: `Yarn Purchase from ${po.supplier?.name || 'Supplier'}`,
      reference: po.orderNumber,
      orderNumber: po.orderNumber,
      amount: po.totalAmount,
      isPositive: false,
      status: po.status
    });
  }

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    period: month || 'All Time',
    summary: {
      totalFabricSalesRevenue,
      totalSpentOnYarn,
      totalWastedYarnQuantity,
      estimatedWastedYarnCost,
      netProfitOrLoss,
      isProfitable,
      totalFabricOrdersDelivered: invoices.length,
      totalYarnPurchasesCount: purchaseOrders.length,
      defectRunsCount: defectiveInspections.length
    },
    transactions
  };
}

/**
 * Stage Machines Overview
 * Tracks 3 Steps: Spinning, Weaving, and Dyeing
 * For each step: 3 to 4 parallel machines
 * Tracks for each machine:
 * - Input taken (kg or meters)
 * - Output produced (kg or meters)
 * - Status (RUNNING, IDLE, MAINTENANCE, BREAKDOWN)
 */
async function getStageMachines() {
  const machines = await prisma.machine.findMany({
    where: {
      type: { in: ['SPINNING', 'WEAVING', 'DYEING'] }
    },
    include: {
      stageLogs: {
        include: {
          productionOrder: {
            include: {
              product: true,
              salesOrder: { include: { customer: true } }
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      }
    },
    orderBy: { code: 'asc' }
  });

  const formatted = machines.map((m) => {
    const totalInput = m.stageLogs.reduce((sum, log) => sum + (log.inputQuantity || 0), 0);
    const totalOutput = m.stageLogs.reduce((sum, log) => sum + (log.outputQuantity || 0), 0);
    const activeLog = m.stageLogs.find((log) => log.status === 'IN_PROGRESS');

    return {
      id: m.id,
      code: m.code,
      name: m.name,
      type: m.type, // 'SPINNING' | 'WEAVING' | 'DYEING'
      status: m.status, // 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BREAKDOWN'
      capacityPerShift: m.capacityPerShift,
      currentShift: m.currentShift || 'Shift A',
      inputTaken: Math.round(totalInput * 10) / 10,
      quantityProduced: Math.round(totalOutput * 10) / 10,
      unit: m.type === 'SPINNING' ? 'KG' : 'METER',
      activeJob: activeLog
        ? {
            stageLogId: activeLog.id,
            productionOrderId: activeLog.productionOrderId,
            orderNumber: activeLog.productionOrder?.orderNumber,
            productName: activeLog.productionOrder?.product?.name,
            buyerName: activeLog.productionOrder?.salesOrder?.customer?.name,
            inputQuantity: activeLog.inputQuantity,
            startedAt: activeLog.startedAt
          }
        : null
    };
  });

  return {
    all: formatted,
    spinning: formatted.filter((m) => m.type === 'SPINNING'),
    weaving: formatted.filter((m) => m.type === 'WEAVING'),
    dyeing: formatted.filter((m) => m.type === 'DYEING')
  };
}

/**
 * Update machine status (RUNNING, IDLE, MAINTENANCE, BREAKDOWN)
 */
async function updateMachineStatus(machineId, status) {
  const validStatuses = ['RUNNING', 'IDLE', 'MAINTENANCE', 'BREAKDOWN'];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.machine.update({
    where: { id: machineId },
    data: { status }
  });

  return updated;
}

/**
 * Advance production through the 3 manufacturing steps:
 * SPINNING -> WEAVING -> DYEING -> COMPLETED (ready for QC Inspection)
 */
async function advanceProductionStage(productionOrderId, data = {}) {
  const { targetStage, machineId, outputQuantity, wasteQuantity = 0, notes } = data;

  return await prisma.$transaction(async (tx) => {
    const prod = await tx.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        product: true,
        stageLogs: { include: { machine: true } },
        salesOrder: { include: { customer: true } }
      }
    });

    if (!prod) {
      const err = new Error('Production order not found');
      err.statusCode = 404;
      throw err;
    }

    // Sequence: SPINNING -> WEAVING -> DYEING -> COMPLETED
    const STAGES = ['SPINNING', 'WEAVING', 'DYEING', 'COMPLETED'];
    const currentIdx = STAGES.indexOf(prod.stage);
    const nextStage = targetStage || (currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : 'COMPLETED');

    // 1. Complete the current stage log if one exists
    const currentLog = prod.stageLogs.find((l) => l.stage === prod.stage && l.status === 'IN_PROGRESS') || prod.stageLogs.find((l) => l.stage === prod.stage);
    const outQty = outputQuantity != null ? parseFloat(outputQuantity) : (currentLog?.inputQuantity ? Math.round(currentLog.inputQuantity * 0.98 * 10) / 10 : prod.targetQuantity);

    if (currentLog) {
      await tx.productionStageLog.update({
        where: { id: currentLog.id },
        data: {
          outputQuantity: outQty,
          wasteQuantity: parseFloat(wasteQuantity) || 0,
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: notes || `Completed ${prod.stage} step successfully`
        }
      });
    }

    // If next stage is COMPLETED, finish production and prepare for Quality Inspection
    if (nextStage === 'COMPLETED') {
      const updatedProd = await tx.productionOrder.update({
        where: { id: prod.id },
        data: {
          stage: 'COMPLETED',
          status: 'COMPLETED',
          producedQuantity: outQty,
          endDate: new Date()
        },
        include: { stageLogs: { include: { machine: true } }, machine: true }
      });

      return {
        success: true,
        stage: 'COMPLETED',
        productionOrder: updatedProd,
        message: 'All 3 manufacturing steps (Spinning, Weaving, Dyeing) completed! Fabric is now ready for Step 3 Quality Inspection.'
      };
    }

    // Resolve parallel machine for next stage
    let nextMachineId = machineId;
    if (!nextMachineId) {
      const availableMachine = await tx.machine.findFirst({
        where: {
          type: nextStage,
          status: { in: ['RUNNING', 'IDLE'] }
        },
        orderBy: { code: 'asc' }
      });
      nextMachineId = availableMachine?.id || null;
    }

    if (nextMachineId) {
      await tx.machine.update({
        where: { id: nextMachineId },
        data: { status: 'RUNNING' }
      });
    }

    // 2. Create or update stage log for next stage
    await tx.productionStageLog.upsert({
      where: {
        productionOrderId_stage: {
          productionOrderId: prod.id,
          stage: nextStage
        }
      },
      update: {
        machineId: nextMachineId,
        inputQuantity: outQty,
        outputQuantity: 0.0,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      create: {
        productionOrderId: prod.id,
        stage: nextStage,
        machineId: nextMachineId,
        inputQuantity: outQty,
        outputQuantity: 0.0,
        wasteQuantity: 0.0,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    // 3. Update productionOrder
    const updatedProd = await tx.productionOrder.update({
      where: { id: prod.id },
      data: {
        stage: nextStage,
        machineId: nextMachineId,
        status: 'IN_PROGRESS'
      },
      include: {
        stageLogs: { include: { machine: true } },
        machine: true
      }
    });

    return {
      success: true,
      stage: nextStage,
      productionOrder: updatedProd,
      message: `Production advanced to ${nextStage} stage on machine ${nextMachineId ? 'assigned' : 'pending'}.`
    };
  });
}

module.exports = {
  getMillPipeline,
  createBuyerOrderWithYarnCheck,
  orderYarnFromSupplier,
  startProductionAndDeductYarn,
  recordQualityInspection,
  dispatchFabricToBuyer,
  getOwnerMonthlyFinancials,
  getStageMachines,
  updateMachineStatus,
  advanceProductionStage
};
