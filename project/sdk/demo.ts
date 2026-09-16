import type { Dataset, Item, StoredRecord } from './index';
const items: Item[] = [
  { id:'CB-124',title:'Improve workspace onboarding',status:'To do',priority:'High',assignee:'Alex',project:'Experience',description:'Help new members reach their first useful task.',due:'2026-09-22' },
  { id:'CB-128',title:'Review API response times',status:'In progress',priority:'High',assignee:'Sam',project:'Platform',description:'Investigate p95 latency across the workspace endpoints.' },
  { id:'CB-131',title:'Keyboard navigation for panels',status:'In progress',priority:'Medium',assignee:'Alex',project:'Experience' },
  { id:'CB-136',title:'Document release checklist',status:'Done',priority:'Low',assignee:'Jordan',project:'Operations' },
  { id:'CB-139',title:'Refresh account settings',status:'To do',priority:'Medium',assignee:'Jordan',project:'Experience' },
];
let records: StoredRecord[] = items.map(item => ({ recordId:item.id,version:1,values:item }));
window.cobaltDashboardDemo = true;
window.cobaltDashboard = {
  async getDataset<T>() { return { configured:true,mode:'records',items,columns:['To do','In progress','Done'],metrics:[{label:'Active work',value:24,change:'+4 this week'},{label:'Completed',value:18,change:'75% of planned work'},{label:'Cycle time',value:'2.4d',change:'Down 0.6d'},{label:'Needs attention',value:3,change:'Across 2 projects'}],series:[{label:'Mon',value:14},{label:'Tue',value:23},{label:'Wed',value:19},{label:'Thu',value:36},{label:'Fri',value:31},{label:'Sat',value:42},{label:'Sun',value:48}] } satisfies Dataset as T; },
  async getRecords() { return { items: structuredClone(records) }; },
  async requestAction(key,input) {
    const id = typeof input.recordId === 'string' ? input.recordId : crypto.randomUUID();
    const existing = records.find(item => item.recordId === id);
    if (existing && existing.version !== input.expectedVersion) throw new Error('Card changed. Refresh and try again.');
    if (key === 'delete-card') records = records.filter(item => item.recordId !== id);
    else { const record = {recordId:id,version:(existing?.version ?? 0)+1,values:input.values as Item}; records = [...records.filter(item=>item.recordId!==id),record]; }
    return {success:true};
  },
};
