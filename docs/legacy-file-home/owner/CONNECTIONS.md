# Connections and authority

No connection or standing authorization is configured. Local work is available
without Git. Record only a verified nonsecret access path, account purpose,
read/write capability, exact authorized action/destination, source of approval,
verification date and current status. Scope access to the needed resources
(such as tables/views, folders or repositories), operation and account; prefer
read-only access for reading tasks and record the tested permission boundary.
Do not infer access to future resources from a broad credential. Use existing
secret storage; never store tokens or passwords. Resource owners implement and
verify permissions, including relevant row/tenant limits and forbidden reads.

Optional Git configuration must name owner-data root, remote, credential-free
fetch/push URLs, branch ref, account, allowed paths and push approval. Default
is ask; standing approval exists only if the user explicitly granted it.
