// Demo script to populate the credit-engine with sample data
const API_BASE = 'http://localhost:3000';

async function runDemo() {
    console.log('🚀 Starting Credit Engine Demo...');
    
    const users = [
        { id: 'alice_smith', name: 'Alice Smith' },
        { id: 'bob_jones', name: 'Bob Jones' },
        { id: 'charlie_brown', name: 'Charlie Brown' },
        { id: 'diana_prince', name: 'Diana Prince' },
        { id: 'eve_adams', name: 'Eve Adams' }
    ];

    const actions = [
        { type: 'enrollment', credits: 100 },
        { type: 'social_post', credits: 25 },
        { type: 'tech_module', credits: 75 },
        { type: 'spend_multiplier', credits: 200 },
        { type: 'coffee_wall', credits: 10 }
    ];

    try {
        // Step 1: Create initial users
        console.log('📝 Creating initial users...');
        for (const user of users.slice(0, 3)) {
            const response = await fetch(`${API_BASE}/api/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    creditsAwarded: 100,
                    actionType: 'enrollment'
                })
            });
            const result = await response.json();
            console.log(`✅ ${user.name}: ${result.message}`);
        }

        // Step 2: Create users with referrals
        console.log('\n🔗 Testing referral system...');
        for (const user of users.slice(3)) {
            const referrerId = users[Math.floor(Math.random() * 3)].id;
            const response = await fetch(`${API_BASE}/api/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    referrerId: referrerId,
                    creditsAwarded: 150,
                    actionType: 'enrollment'
                })
            });
            const result = await response.json();
            console.log(`✅ ${user.name} referred by ${referrerId}`);
            if (result.referral) {
                console.log(`   💰 Referral bonus: ${result.referral.bonusAwarded} credits`);
            }
        }

        // Step 3: Add various activities
        console.log('\n🎯 Adding various activities...');
        for (let i = 0; i < 10; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            const response = await fetch(`${API_BASE}/api/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    creditsAwarded: action.credits,
                    actionType: action.type
                })
            });
            const result = await response.json();
            console.log(`📊 ${user.name}: ${action.type} (+${action.credits} credits)`);
        }

        // Step 4: Show final stats
        console.log('\n📈 Final System Statistics:');
        const statsResponse = await fetch(`${API_BASE}/api/credits/system/stats`);
        const stats = await statsResponse.json();
        
        console.log(`Total Credits Awarded: ${stats.totalCredits}`);
        console.log(`Total Events: ${stats.totalEvents}`);
        console.log(`Unique Users: ${stats.uniqueUsers}`);
        console.log(`Recent Activity: ${stats.recentActivity}`);

        // Step 5: Show sample user details
        console.log('\n👤 Sample User Details:');
        const sampleUser = users[0].id;
        const userResponse = await fetch(`${API_BASE}/api/credits/${sampleUser}?includeReferrals=true`);
        const userDetails = await userResponse.json();
        
        console.log(`${sampleUser}:`);
        console.log(`  Total Credits: ${userDetails.totalCredits}`);
        console.log(`  Total Events: ${userDetails.totalEvents}`);
        console.log('  Credits by Action:', userDetails.creditsByAction);

        console.log('\n🎉 Demo completed successfully!');
        console.log('\n🌐 Open http://localhost:3000 in your browser to test the frontend!');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runDemo };
} else {
    // Browser environment
    window.runDemo = runDemo;
} 