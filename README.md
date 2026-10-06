# Assignment 39: Validation and Centralized Error Handling

Express + Zod. Run: `npm install && npm start` (server) or `npm test` (tests, Node 18+).

## Standard error format
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "requestId": "uuid", "details": [ {location, field, message} ] } }
