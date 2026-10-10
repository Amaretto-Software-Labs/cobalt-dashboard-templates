# Dashboard template authoring

Use the shared Cobalt OpenUI catalog and typed dataset references. Do not add browser code,
HTML, React/Vite projects or a copied UI runtime. Keep every template source in its bounded
source.json map, retain explicit setup failures until authorized real data is configured,
and never include credentials, sample results or `.cobalt` session files. Validate with
the pinned public parser and the actual Cobalt server validator. Template publication is
separate from dashboard activation; record the exact template commit in every created draft.
