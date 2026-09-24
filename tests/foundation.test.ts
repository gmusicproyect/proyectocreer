import assert from 'node:assert/strict';
import { test } from 'node:test';
import { can } from '../src/modules/auth/permissions.ts';
import { toPublicProduct } from '../src/modules/products/types.ts';
import { isAdminPreviewEnabled } from '../src/modules/auth/access.ts';
test('authorization denies anonymous, cross-tenant and unauthorized cost access', () => {
 assert.equal(can(null,'creer','costs:read'),false);
 assert.equal(can({userId:'1',tenantId:'other',role:'tenant_admin'},'creer','costs:read'),false);
 assert.equal(can({userId:'1',tenantId:'creer',role:'sales'},'creer','costs:read'),false);
 assert.equal(can({userId:'1',tenantId:'creer',role:'tenant_admin'},'creer','costs:read'),true);
 assert.equal(can({userId:'1',tenantId:'creer',role:'provider_owner'},'creer','costs:read'),false);
});
test('public projection removes internal fields even if present at runtime', () => {
 const value = {id:'1',tenantId:'creer',sku:'A',slug:'a',name:'A',description:'',categoryId:'1',imageUrl:null,priceMinor:3200,currency:'BRL' as const,published:true,stock:1,costMinor:1800,supplierId:'private'};
 const output = toPublicProduct(value);
 assert.equal('costMinor' in output,false); assert.equal('supplierId' in output,false); assert.equal('published' in output,false); assert.equal(output.priceMinor,3200);
});
test('admin preview is impossible in production even when flag is enabled', () => {
 const previousNode = process.env.NODE_ENV; const previousPreview = process.env.CREER_ADMIN_PREVIEW;
 try { Object.assign(process.env,{NODE_ENV:'production',CREER_ADMIN_PREVIEW:'true'}); assert.equal(isAdminPreviewEnabled(),false); Object.assign(process.env,{NODE_ENV:'development'}); assert.equal(isAdminPreviewEnabled(),true); delete process.env.CREER_ADMIN_PREVIEW; assert.equal(isAdminPreviewEnabled(),false); }
 finally { if(previousNode===undefined) Reflect.deleteProperty(process.env,"NODE_ENV"); else Object.assign(process.env,{NODE_ENV:previousNode}); if(previousPreview===undefined) delete process.env.CREER_ADMIN_PREVIEW; else process.env.CREER_ADMIN_PREVIEW=previousPreview; }
});
