# Stratagem Troubleshooting Guide

### 1. Database Lock Traps
If you encounter `database is locked` during concurrent syncs, verify that:
- WAL mode (`PRAGMA journal_mode = WAL;`) is activated.
- Explicit short busy timeouts (`PRAGMA busy_timeout = 5000;`) are configured.

### 2. Node & Build Errors
- Ensure Node version >= 18.
- Clear cached modules with `npm clean-install` or delete `node_modules` before rebuilding.
