# A Little World for Giang · 20.10

Một món quà nhỏ dạng website tĩnh: thư mở đầu, lời chúc 20/10, gallery ảnh,
bốn lời chúc, ba lá thư "mở khi…", một lá thư niêm phong bằng sáp và lời kết.

Không cần đăng nhập, không API, không dịch vụ ngoài. Toàn bộ font và ảnh đều
được lưu trong thư mục dự án, nên chỉ cần mở là chạy.

## Chạy thử

Cách nhanh nhất — mở thẳng `index.html` bằng trình duyệt.

Nếu muốn chạy như khi deploy (khuyến nghị, để gallery kiểm tra ảnh chính xác):

```bash
cd DatetoMarry
python -m http.server 8123
```

Sau đó mở <http://127.0.0.1:8123/>.

## Thêm ảnh của Giang

1. Thả **một** ảnh vào `public/images/` với tên `giang-main.jpg`
   (4:5 dọc, khuyến nghị ~1200 × 1500px).
2. Tải lại trang — ảnh sẽ hiện trong khung lớn giữa gallery.
3. Nếu ảnh bị cắt lệch khuôn mặt, chỉnh `--gallery-pos` cho `.gallery-main__image`
   trong `css/style.css` (ví dụ `--gallery-pos: 50% 25%;`).

Khi chưa có ảnh, khung lớn hiển thị placeholder nghệ thuật
"A special place for Giang’s photo" và nút xem ảnh lớn tự ẩn. Bấm vào ảnh để mở
toàn màn hình (đóng bằng nút × hoặc phím Esc).

Chi tiết hơn: [`public/images/README.md`](public/images/README.md).

## Cấu trúc

```
index.html              toàn bộ nội dung & các dialog
css/style.css           art direction, layout, responsive, animation
js/main.js              petals, reveal, parallax, envelope, letter, lightbox
assets/                 ảnh nền hoa hồng, favicon
assets/fonts/           font self-hosted (Cormorant Garamond, Be Vietnam Pro, Dancing Script)
public/images/          ảnh của Giang (tùy chọn)
```

## Deploy

Đây là site tĩnh, không build:

- **Vercel**: tạo project mới → chọn thư mục này → Framework Preset: **Other** →
  Build Command để trống → Output Directory để trống (hoặc `/`). Vercel sẽ phục vụ
  `index.html` và toàn bộ file tĩnh trong repo.
- **Netlify / Cloudflare Pages / GitHub Pages**: kéo-thả cả thư mục hoặc trỏ vào
  nhánh `main`, không cần lệnh build.

Đường dẫn trong site đều là tương đối, nên chạy được ở thư mục gốc của domain
hoặc trong một sub-folder.

## Chỉnh sửa nhanh

- **Chữ nghĩa**: sửa trực tiếp trong `index.html`. Các câu thoại chính nằm ở
  các section `#welcome`, `#gallery`, `#wishes`, `#open-when`, `#letter`, `#finale`.
- **Màu sắc**: sửa bảng biến ở đầu `css/style.css` (`--pearl`, `--blush`,
  `--burgundy`, `--wine`, `--gold`, …).
- **Hiệu ứng**: nếu muốn nhẹ hơn, giảm số lượng cánh hoa trong `initCanvas()`
  ở `js/main.js`, hoặc để trình duyệt tự tắt bằng `prefers-reduced-motion`.
- **Nội dung lá thư mở-khi**: các `<template>` nằm cuối `index.html`.

## Ghi chú

- Ảnh hoa hồng nền: [Pexels](https://www.pexels.com/) (ảnh miễn phí), photo IDs
  17722209, 32418006, 9376941, 25811335.
- Ảnh trong `public/images/` là ảnh do bạn tự cung cấp; site không tải ảnh từ
  dịch vụ ngoài, không upload, không dùng API.
- Trang tôn trọng `prefers-reduced-motion`: tắt cánh hoa, parallax và animation
  khi người xem đã bật giảm chuyển động.
