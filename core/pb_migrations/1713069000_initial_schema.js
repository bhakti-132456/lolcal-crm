migrate((db) => {
  const dao = new Dao(db);

  const collection_companies = new Collection({
    "name": "companies",
    "type": "base",
    "schema": [
      { "name": "name", "type": "text", "required": true },
      { "name": "domain", "type": "url" },
      { "name": "sector", "type": "text" }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": ""
  });

  const collection_people = new Collection({
    "name": "people",
    "type": "base",
    "schema": [
      { "name": "firstName", "type": "text", "required": true },
      { "name": "lastName", "type": "text", "required": true },
      { "name": "email", "type": "email", "required": true },
      { "name": "phone", "type": "text" },
      { "name": "jobTitle", "type": "text" },
      { "name": "linkedin", "type": "text" },
      { "name": "location", "type": "text" },
      { "name": "industry", "type": "text" },
      { "name": "status", "type": "select", "options": { "values": ["New", "Contacted", "Qualified", "Lost"] } },
      { "name": "company", "type": "relation", "options": { "collectionId": collection_companies.id, "maxSelect": 1 } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": ""
  });

  dao.saveCollection(collection_companies);
  dao.saveCollection(collection_people);
}, (db) => {
  const dao = new Dao(db);
  try {
    const p = dao.findCollectionByNameOrId("people");
    dao.deleteCollection(p);
    const c = dao.findCollectionByNameOrId("companies");
    dao.deleteCollection(c);
  } catch (e) {}
})
