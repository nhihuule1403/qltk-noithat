#!/bin/bash
# Khôi phục CSDL từ một bản sao lưu:  ./db/restore.sh backups/qltk_20260930_230000.sql.gz
# Ghi đè toàn bộ dữ liệu hiện tại, nên script hỏi xác nhận trước.
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
FILE=${1:?Cần đường dẫn file sao lưu}
[ -f "$FILE" ] || { echo "Không tìm thấy $FILE" >&2; exit 1; }

if [ "${2:-}" != "--yes" ]; then
  read -r -p "Dữ liệu hiện tại sẽ bị thay bằng $FILE. Tiếp tục? (y/N) " ans
  [ "$ans" = "y" ] || exit 1
fi
gunzip -c "$FILE" | docker exec -i qltk-db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null
echo "Đã khôi phục từ $FILE"
