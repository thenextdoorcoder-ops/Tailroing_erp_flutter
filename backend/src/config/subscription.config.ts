export const SUBSCRIPTION_LIMITS = {
    BASIC: {
        ordersPerMonth: 100,
        staffCount: 3,
        customers: 10,
        students: 50,
    },
    SILVER: {
        ordersPerMonth: 10000,
        staffCount: 10,
        customers: 500,
        students: 200,
    },
    GOLD: {
        ordersPerMonth: 999999, // Unlimited
        staffCount: 999999, // Unlimited
        customers: 999999, // Unlimited
        students: 999999, // Unlimited
    },
    // Fallback for any other roles/plans
    DEFAULT: {
        ordersPerMonth: 20,
        staffCount: 0,
        customers: 100,
        students: 20,
    }
};
