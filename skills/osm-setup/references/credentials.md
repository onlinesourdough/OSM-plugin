# Connect a source securely

Start with the intended account, source and action. Reuse a supported
connection or provider sign-in if it reaches the selected source with the
required scope. Where a service needs an API key, enter it directly in the
credential store selected for that runtime, such as the operating system
key store, a project secret manager or the deployment platform's secrets.
Use the runtime's supported injection path. Keep the value out of chat,
Notion, source control, clipboard automation, command output and run logs.

## Verify the permission you need

- Start with a scoped read of a known record. Confirm the account or
  workspace, the resource and the result. A valid credential or saved link
  alone does not prove access to the selected source.
- For Notion, check **Read content**, **Insert content** and **Update content**
  separately. Grant the chosen integration access to the exact pages or
  databases needed. Verify a write and readback only when both the provider
  grant and the owner's write policy allow it. Use a designated test record
  when checking a write independently of the first real task.
- Test a scheduled connection in the runtime that will run it. Check the
  intended resource and action there. A successful interactive read does not
  prove the scheduled process can use its credential or write.

Record the provider, selected account and resource, intended action, reader
or writer, result and date. Use the existing source agreement and run result
for these details. If verification fails, report the specific failure:
missing credential, denied account or destination, or an unsupported action.

## Rotate or recover

Before switching an existing route, test the replacement in the intended
runtime where the provider permits overlapping credentials. Keep the previous
binding available for recovery until readback succeeds, then revoke the old
credential. If the provider invalidates the old credential immediately, follow
its documented recovery path. A failed check does not justify a broader
grant or switching accounts.

[Notion internal connections](https://developers.notion.com/guides/connections-and-tokens/internal-connections) · [Notion capabilities](https://developers.notion.com/reference/capabilities)
