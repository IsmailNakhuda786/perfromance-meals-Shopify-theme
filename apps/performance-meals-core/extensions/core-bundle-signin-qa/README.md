# Inactive development-only bundle sign-in QA Function

User-approved copy of labs/core-bundle-signin-function, uploaded only through Performance Meals Development's app dev preview. Native unpaid draft comparison on20October2026: signed-in checkout allowed; after sign-out the same checkout displayed the exact server validation error. The one-product validation rule is disabled after QA and independently read back with zero enabled rules. No order/payment.

Default-off app-owned configuration and exact QA-product allowlist are required. This is not general production activation or proof of normal/accelerated storefront checkout. Core review/cart binding remains gated separately.

Build requires Rust/Cargo with wasm32-unknown-unknown. Cargo.lock pins dependencies. The current machine used isolated /private/tmp toolchain directories and process-local SDKROOT=MacOSX15.4 for its existing linker. No compiler, credentials or compiled artifacts are checked in. App dev needs the compiler in its process PATH; never deploy/release or enable a rule without specific authorization.
