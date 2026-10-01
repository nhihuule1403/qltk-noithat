export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (what = 'Dữ liệu') => new HttpError(404, `Không tìm thấy ${what.toLowerCase()}`);

// Chuyển lỗi MySQL thành phản hồi HTTP dễ hiểu
const MYSQL_ERRORS = {
  ER_DUP_ENTRY: [409, 'Dữ liệu bị trùng với bản ghi đã có'],
  ER_ROW_IS_REFERENCED_2: [409, 'Không thể xóa vì dữ liệu đang được sử dụng ở nơi khác'],
  ER_NO_REFERENCED_ROW_2: [400, 'Dữ liệu tham chiếu không tồn tại'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Dữ liệu không thỏa ràng buộc'],
  ER_BAD_NULL_ERROR: [400, 'Thiếu dữ liệu bắt buộc'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'Giá trị không hợp lệ'],
  ER_DATA_TOO_LONG: [400, 'Dữ liệu vượt quá độ dài cho phép'],
};

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // SIGNAL SQLSTATE '45000' từ trigger / stored procedure: thông báo nghiệp vụ
  if (err.sqlState === '45000') {
    return res.status(400).json({ message: err.sqlMessage });
  }
  if (err.code && MYSQL_ERRORS[err.code]) {
    const [status, message] = MYSQL_ERRORS[err.code];
    return res.status(status).json({ message, detail: err.sqlMessage });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
  }
  console.error(err);
  res.status(500).json({ message: 'Lỗi hệ thống, vui lòng thử lại sau' });
}
