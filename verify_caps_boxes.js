const mongoose = require('mongoose');
require('dotenv').config();

async function verifyCapCustomization() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Product = require('./models/Product');
        const Customer = require('./models/Customer');

        console.log('--- Verification Start (Custom Caps & Standard Boxes) ---\n');

        // 1. Create Branded Customer with Golden Cap
        const customer = new Customer({
            customerName: 'Heritage Resort',
            customerType: 'Branded',
            status: 'Active',
            capColor: 'Golden'
        });
        await customer.save();
        console.log(`Created Customer: Heritage Resort (Cap Color: Golden)`);

        // 2. Mock creation of 1L P for Heritage Resort
        const template = await Product.findOne({ productName: '1L P', isTemplate: true }).populate('components.productId');
        if (!template) throw new Error('Template 1L P not found');

        const brandedComponents = [];
        const capColor = customer.capColor;

        for (const comp of template.components) {
            if (comp.productId && comp.productId.isTemplate) {
                // Formatting suffix for Cap
                let rmSuffix = comp.productName;
                if (rmSuffix === 'Cap' && capColor) {
                    rmSuffix = `${capColor} Cap`;
                }
                
                const brandedRMName = `Heritage Resort - 1L P ${rmSuffix}`;
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
                // Regular RM (Box is now regular)
                brandedComponents.push({ productId: comp.productId._id, productName: comp.productName, quantity: comp.quantity, uom: comp.uom });
            }
        }

        const brandedFG = new Product({
            productName: `Heritage Resort - 1L P`,
            productType: 'Finished Good',
            isBranded: true,
            brandedCustomerId: customer._id,
            components: brandedComponents
        });
        await brandedFG.save();

        console.log('\n--- Result Check ---');
        console.log(`FG Name: ${brandedFG.productName}`);
        
        brandedFG.components.forEach(c => {
            const status = c.productName.includes('Heritage Resort') ? 'Custom' : 'Standard';
            console.log(`- [${status}] Component: ${c.productName}`);
        });

        const hasGoldenCap = brandedFG.components.some(c => c.productName === 'Heritage Resort - 1L P Golden Cap');
        const hasStandardBox = brandedFG.components.some(c => c.productName === 'Box');

        console.log(`\nHas Golden Cap: ${hasGoldenCap ? '✅ YES' : '❌ NO'}`);
        console.log(`Has Standard Box: ${hasStandardBox ? '✅ YES' : '❌ NO'}`);

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyCapCustomization();
