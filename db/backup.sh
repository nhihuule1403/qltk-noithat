#!/bin/bash
# Sao lưu CSDL bằng mysqldump (thay cho BACKUP DATABASE của SQL Server).
# Tạo backups/qltk_<thời gian>.sql.gz, xóa bản cũ hơn KEEP_DAYS ngày (mặc định 7).
# Lập lịch bằng cron mỗi giờ để dữ liệu mất tối đa khoảng một giờ:
#   0 * * * *  cd /đường/dẫn/qltk-noithat && ./db/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
mkdir -p backups
FILE="backups/qltk_$(date +%Y%m%d_%H%M%S).sql.gz"

docker exec qltk-db mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --routines --triggers --events \
  --databases QLTonKhoNoiThat 2>/dev/null | gzip > "$FILE"

# Kiểm tra bản sao lưu dùng được (tương đương RESTORE VERIFYONLY)
gunzip -t "$FILE"
gunzip -c "$FILE" | grep -q "Dump completed" || { echo "Bản sao lưu không hoàn chỉnh: $FILE" >&2; exit 1; }

find backups -name 'qltk_*.sql.gz' -mtime +"${KEEP_DAYS:-7}" -delete
echo "$(date '+%F %T') Đã sao lưu: $FILE ($(du -h "$FILE" | cut -f1))"
