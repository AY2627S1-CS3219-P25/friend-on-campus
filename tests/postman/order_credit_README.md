# Order and credit Postman flows

Import [order_credit_collection.json](./order_credit_collection.json). It follows the request/response assertion style of `postman_collection.json`, with dedicated fixtures and eventual-consistency polling for the current event-driven implementation. The original collections and environment are unchanged.

There are **863 saved requests: 775 in the default run and 88 opt-in requests**. Polls and concurrent `pm.sendRequest` calls add HTTP executions at runtime. The suite covers the implemented HTTP branches and representative boundary/type inputs; finite tests cannot exhaust arbitrary inputs, outage durations or thread schedules. The table below identifies coverage that requires another test layer.

## Run

For Postman CLI, run the JSON collection from the repository root with the local stack running:

```bash
postman collection run tests/postman/order_credit_collection.json \
  --timeout-request 15000 \
  --timeout-script 30000 \
  --reporters cli,html \
  --reporter-html-export order-credit-report.html
```

To capture the terminal output and errors in a text file, including progress as the run executes:

```bash
set -o pipefail
postman collection run tests/postman/order_credit_collection.json \
  --timeout-request 15000 \
  --timeout-script 30000 \
  --disable-unicode 2>&1 | tee order-credit-output.log
```