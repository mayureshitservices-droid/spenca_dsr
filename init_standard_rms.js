const mongoose = require('mongoose');
require('dotenv').config();

async function initializeTemplates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Product = require('./models/Product');

        // 1. Standard RMs (Templates)
        const standardRMs = [
            { productName: '32 gm Preform', productType: 'Raw Material', uom: 'pcs', isTemplate: false },
            { productName: '20 gm Preform', productType: 'Raw Material', uom: 'pcs', isTemplate: false },
            { productName: '12.8 gm Preform', productType: 'Raw Material', uom: 'pcs', isTemplate: false },
            { productName: '11.5 gm Preform', productType: 'Raw Material', uom: 'pcs', isTemplate: false },
            { productName: '7.5 gm Preform', productType: 'Raw Material', uom: 'pcs', isTemplate: false },
            { productName: 'Cap', productType: 'Raw Material', uom: 'pcs', isTemplate: true },
            { productName: 'Box', productType: 'Raw Material', uom: 'box', isTemplate: false },
            { productName: 'Label', productType: 'Raw Material', uom: 'pcs', isTemplate: true },
            { productName: 'Shrink Paper', productType: 'Raw Material', uom: 'g', isTemplate: false }
        ];

        console.log('Initializing standard Raw Materials and Templates...');
        for (const rm of standardRMs) {
            await Product.findOneAndUpdate(
                { productName: rm.productName },
                { ...rm, availableQty: 0, factoryStock: { indapur: 0, shirapur: 0 } },
                { upsert: true, new: true }
            );
            console.log(`- RM: ${rm.productName} (isTemplate: ${rm.isTemplate})`);
        }

        // 2. Core FG Templates from BOM with SHORT names
        const coreFGs = [
            { productName: '1 Ltr Pre', packaging: '12', preform: '32 gm', box: 0.0833, shrink: 6.94 },
            { productName: '500 Ml Pre', packaging: '24', preform: '20 gm', box: 0.0417, shrink: 3.47 },
            { productName: '250 Ml Pre', packaging: '40', preform: '11.5 gm', box: 0.0250, shrink: 2.08 },
            { productName: '1 Ltr Sq', packaging: '12', preform: '20 gm', box: 0.0833, shrink: 6.94 },
            { productName: '500 Ml Sq', packaging: '24', preform: '11.5 gm', box: 0.0417, shrink: 3.47 },
            { productName: '200 Ml Sq', packaging: '48', preform: '7.5 gm', box: 0.0208, shrink: 1.74 },
            { productName: '1 Ltr Reg', packaging: '12', preform: '20 gm', box: 0.0833, shrink: 6.94 },
            { productName: '500 Ml Reg', packaging: '24', preform: '12.8 gm', box: 0.0417, shrink: 3.47 },
            { productName: '2 Ltr Reg', packaging: '6', preform: '32 gm', box: 0.1667, shrink: 13.89 },
            { productName: '1 Ltr Alk', packaging: '12', preform: '32 gm', box: 0.0833, shrink: 6.94 }
        ];

        console.log('\nInitializing Core FG Templates...');
        for (const fg of coreFGs) {
            const product = await Product.findOneAndUpdate(
                { productName: fg.productName, productType: 'Finished Good' },
                { 
                    productName: fg.productName, 
                    packaging: fg.packaging, 
                    isTemplate: true, 
                    productType: 'Finished Good', 
                    uom: 'boxes', 
                    availableQty: 0, 
                    factoryStock: { indapur: 0, shirapur: 0 } 
                },
                { upsert: true, new: true }
            );

            const box = await Product.findOne({ productName: 'Box' });
            const cap = await Product.findOne({ productName: 'Cap' });
            const lbl = await Product.findOne({ productName: 'Label' });
            const pfm = await Product.findOne({ productName: fg.preform + ' Preform' });
            const shrink = await Product.findOne({ productName: 'Shrink Paper' });

            const components = [];
            if (pfm) components.push({ productId: pfm._id, productName: pfm.productName, quantity: 1, uom: 'pcs' });
            if (cap) components.push({ productId: cap._id, productName: cap.productName, quantity: 1, uom: 'pcs' });
            if (lbl) components.push({ productId: lbl._id, productName: lbl.productName, quantity: 1, uom: 'pcs' });
            if (box) components.push({ productId: box._id, productName: box.productName, quantity: fg.box, uom: 'box' });
            if (shrink) components.push({ productId: shrink._id, productName: shrink.productName, quantity: fg.shrink, uom: 'g' });

            product.components = components;
            await product.save();
            console.log(`- FG: ${fg.productName} (BOM linked)`);
        }

        console.log('\nAll templates initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    }
}

initializeTemplates();
