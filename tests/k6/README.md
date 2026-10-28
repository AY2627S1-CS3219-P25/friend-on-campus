# k6 Concurrency & Autoscaling Load Test Suite

> **Course**: NUS CS3219 Software Design and Architecture  
> **Milestone**: D4 Verification (Categories N3 & N4)  
> **Prerequisites**: Install k6 via `brew install k6` or run via Docker `docker run --rm -i grafana/k6`

---

## 1. Test Scenarios

### Scenario A: Distributed Race Condition Verification (`order-claim-race.js`)
* **Objective**: Verifies that when 20 couriers simultaneously claim the exact same open errand at the exact same millisecond, exactly **1** courier succeeds with HTTP `200` (`ACCEPTED`), and **19** fail cleanly with HTTP `409 Conflict`.
* **Rubric Target**: Category N3 (Testing & Reliability) — Distributed concurrency and optimistic locking proof.
* **Run Command**:
  ```bash
  # Local stack:
  k6 run tests/k6/order-claim-race.js

  # AWS Production Cluster:
  TARGET_HOST="http://<ALB_DNS>" k6 run tests/k6/order-claim-race.js
  ```

### Scenario B: Campus Discovery Traffic Spike & HPA Autoscaling (`discovery-load.js`)
* **Objective**: Ramps from 10 to 150 concurrent Virtual Users browsing the errands feed and campus canteens. Drives CPU utilization over 60%, demonstrating live **Horizontal Pod Autoscaler (HPA)** pod expansion from 2 to 5 replicas.
* **Rubric Target**: Category N4 (Cloud Deployment & Automated Scaling) — Live demonstration with evidence.
* **Run Command**:
  ```bash
  # Terminal 1: Watch K3s Horizontal Pod Autoscaler in real time
  kubectl get hpa -n foc -w

  # Terminal 2: Execute load test
  TARGET_HOST="http://<ALB_DNS>" k6 run tests/k6/discovery-load.js
  ```
