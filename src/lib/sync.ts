// ANTES (falla)
export function onProductsInsert(payload) { /* ... */ }
export function onProductsUpdate(payload) { /* ... */ }
export function onOrdersInsert(payload) { /* ... */ }
export function onOrdersUpdate(payload) { /* ... */ }

// DESPUÉS (compila)
export function onProductsInsert(payload: any) { /* ... */ }
export function onProductsUpdate(payload: any) { /* ... */ }
export function onOrdersInsert(payload: any) { /* ... */ }
export function onOrdersUpdate(payload: any) { /* ... */ }
