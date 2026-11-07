# CI platform matrix

Intake supports GitHub Actions on Ubuntu x86_64 only. No Windows, macOS, ARM64, musl or emulator support is declared.

| Platform | CI job | Coverage |
|---|---|---|
| ubuntu-24.04 x86_64 | primary | Python unit/integration/operational/security tests; Node/TypeScript lint/build; workflow validation; dependency and secret scans; Pages build/smoke/rollback |

Local developer environments are convenience targets, not a CI platform promise. Pin the runner label and every action SHA after existence checks in S-000. Do not add oldest-toolchain, ARM64 or musl jobs without new intake evidence and a recorded decision. The current project has historical CI on Python 3.10/3.11/3.12 and Node 20, but exact pins and lockfiles must be verified before retaining that matrix.
