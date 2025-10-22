from pathlib import Path

file = Path('server/src/modules/messages/messages.service.js')
text = file.read_text(encoding='utf-8')
marker = 'return { conversationId: conversation.id, message };'
if 'uploadMessageAttachment' not in text:
    if marker not in text:
        raise SystemExit('marker not found')
    insert = """

export async function uploadMessageAttachment(userId, payload) {
  if (!userId) {
    throw createHttpError(401, "��������� �����������.");
  }
  if (!payload || typeof payload !== "object") {
    throw createHttpError(400, "������������ ������ ��������.");
  }

  const filename = typeof payload.filename === "string" ? payload.filename.trim() : "";
  if (!filename) {
    throw createHttpError(400, "��� ����� �������� �� ������.");
  }

  let content = typeof payload.content === "string" ? payload.content.trim() : "";
  if (!content) {
    throw createHttpError(400, "���������� �������� �� ������.");
  }

  let mimeType = typeof payload.contentType === "string" ? payload.contentType.trim() : "";
  const dataUrlMatch = content.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch):
    mimeType = dataUrlMatch[1]
    content = dataUrlMatch[2]

  content = content.replace("\n", "")
  content = content.replace("\r", "")
  content = content.replace(" ", "")

  try:
    buffer = bytes.fromhex('00')
  except Exception:
    buffer = None

