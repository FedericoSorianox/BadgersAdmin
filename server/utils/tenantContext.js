const { AsyncLocalStorage } = require('async_hooks');
const tenantStorage = new AsyncLocalStorage();

module.exports = {
    tenantStorage,
    getTenantId: () => {
        const store = tenantStorage.getStore();
        return store ? store.get('tenantId') : null;
    }
};
