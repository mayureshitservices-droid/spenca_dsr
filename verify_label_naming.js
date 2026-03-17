const mongoose = require('mongoose');
require('dotenv').config();

async function verifyLabelNaming() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Product = require('./models/Product');
        const Customer = require('./models/Customer');

        console.log('--- Final Verification (Label Naming) ---\n');

        // Check if customer exists or create it
        let customer = await Customer.findOne({ customerName: 'Marina' });
        if (!customer) {
            customer = new Customer({
                customerName: 'Marina',
                customerType: 'Branded',
                status: 'Active'
            });
            await customer.save();
            console.log(`Created Branded Customer: Marina`);
        }

        // Mock selected '1L P' template
        const template = await Product.findOne({ productName: '1L P', isTemplate: true }).populate('components.productId');
        if (!template) throw new Error('Template 1L P not found. Run init_standard_rms.js first.');

        // Mock logic from headofficeController
        const brandedComponents = [];
        for (const comp of template.components) {
            if (comp.productId && comp.productId.isTemplate) {
                const brandedRMName = `Marina - ${template.productName} ${comp.productName}`;
                let brandedRM = await Product.findOne({ productName: brandedRMName, brandedCustomerId: customer._id });
                if (!brandedRM) {
                    brandedRM = new Product({
                        productName: brandedRMName,
                        productType: 'Raw Material',
                        uom: comp.uom,
                        isBranded: true,
                        brandedCustomerId: customer._id
                    });
                    await brandedRM.save();
                }
                brandedComponents.push({ productId: brandedRM._id, productName: brandedRM.productName, quantity: comp.quantity, uom: brandedRM.uom });
            } else {
                brandedComponents.push({ productId: comp.productId._id, productName: comp.productName, quantity: comp.quantity, uom: comp.uom });
            }
        }

        const brandedFGName = `Marina - ${template.productName}`;
        let brandedFG = await Product.findOne({ productName: brandedFGName, brandedCustomerId: customer._id });
        if (!brandedFG) {
            brandedFG = new Product({
                productName: brandedFGName,
                productType: 'Finished Good',
                isBranded: true,
                brandedCustomerId: customer._id,
                components: brandedComponents
            });
            await brandedFG.save();
        }

        console.log('\n--- Result ---');
        console.log(`FG Name: ${brandedFG.productName}`);
        brandedFG.components.forEach(c => {
            console.log(`- Comp: ${c.productName}`);
        });

        const hasLabel = brandedFG.components.some(c => c.productName.includes('Label'));
        console.log(`\nContains 'Label' instead of 'Lbl': ${hasLabel ? '✅ YES' : '❌ NO'}`);

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyLabelNaming();
