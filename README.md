# ♚ Cờ Vua AI — Chess Master

> Game cờ vua hoàn chỉnh với AI mạnh, thiết kế premium, 2 chế độ chơi.

![Version](https://img.shields.io/badge/version-1.0.0-7c6dff)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎮 Chế độ chơi

| Chế độ | Mô tả |
|--------|-------|
| **PvP** (Người vs Người) | Hai người chơi luân phiên trên cùng màn hình |
| **PvE** (Người vs AI) | Đấu với AI siêu mạnh, chọn quân Trắng hoặc Đen |

## 🧠 Sức mạnh AI

Engine AI được xây dựng với các kỹ thuật tiên tiến nhất:

- **Iterative Deepening** — Tìm kiếm sâu dần
- **Alpha-Beta Pruning** — Cắt tỉa nhánh vô ích
- **Transposition Table** — Bảng hash Zobrist 1M entry
- **Quiescence Search** — Tìm kiếm quiescent (tránh horizon effect)
- **Null-Move Pruning** — Bỏ qua nước đi để phát hiện cutoff
- **Late Move Reduction (LMR)** — Giảm độ sâu cho nước đi muộn
- **Killer Moves** — Ghi nhớ nước đi tốt theo ply
- **History Heuristic** — Sắp xếp nước đi theo lịch sử
- **MVV-LVA Move Ordering** — Ưu tiên bắt quân giá trị cao
- **Aspiration Windows** — Thu hẹp cửa sổ tìm kiếm
- **Futility Pruning** — Cắt tỉa ở leaf node
- **Razoring** — Cắt tỉa sớm ở nhánh yếu
- **Check Extensions** — Mở rộng tìm kiếm khi bị chiếu
- **PeSTO Evaluation** — Đánh giá vị trí tinh chỉnh (tapered MG/EG)
- **Opening Book** — Thư viện khai cuộc 35+ biến thể ECO

### Đánh giá vị trí bao gồm:
- Giá trị quân cờ (PeSTO-tuned)
- Bảng giá trị theo vị trí (Piece-Square Tables)
- Cấu trúc tốt (cặp, cô lập, tốt thông)
- An toàn vua (lá chắn tốt)
- Cặp tượng
- Xe trên cột mở
- Tiền đồn mã
- Nội suy MG/EG theo phase

## 📂 Cấu trúc thư mục

```
CỜ VUA/
├── README.md              # Tài liệu dự án
├── index.html             # Trang chính
│
├── src/                   # Mã nguồn (mỗi file 1 chức năng)
│   ├── main.js            # Entry point
│   ├── constants.js       # Hằng số, bảng PST, helper
│   ├── zobrist.js         # Zobrist hashing
│   ├── board.js           # Bàn cờ: make/unmake, tấn công
│   ├── moveGen.js         # Sinh nước đi hợp lệ
│   ├── evaluation.js      # Hàm đánh giá tĩnh
│   ├── search.js          # Thuật toán tìm kiếm AI
│   ├── opening.js         # Thư viện khai cuộc
│   ├── engine.js          # Bộ điều khiển engine
│   ├── game.js            # Quản lý ván đấu
│   ├── renderer.js        # Render DOM (bàn cờ, quân)
│   ├── notation.js        # Ký hiệu đại số (SAN)
│   └── ui.js              # Giao diện & sự kiện
│
├── styles/
│   └── main.css           # CSS premium (dark theme)
│
└── assets/                # Tài nguyên (mở rộng)
    └── README.md          # Placeholder
```

## 🚀 Cách chạy

### Cách 1: Live Server (Khuyến nghị)
```bash
# Cài đặt live-server
npm install -g live-server

# Chạy
cd "CỜ VUA"
live-server
```

### Cách 2: Python HTTP Server
```bash
cd "CỜ VUA"
python -m http.server 8000
# Mở http://localhost:8000
```

### Cách 3: VS Code
- Cài extension **Live Server**
- Chuột phải `index.html` → **Open with Live Server**

> ⚠️ **Lưu ý**: Cần chạy qua HTTP server do sử dụng ES Modules. 
> Mở trực tiếp file HTML sẽ bị lỗi CORS.

## 🎨 Thiết kế

- **Dark theme** với hiệu ứng glassmorphism
- **Gradient** branding đẹp mắt
- **SVG chess pieces** chất lượng cao (Colin Burnett style)
- **Responsive** — chơi tốt trên mobile
- **Animations** — hiệu ứng mượt mà
- **Font Inter + JetBrains Mono** — typography premium

## ⚙️ Tùy chỉnh AI

Dùng thanh trượt **"Độ mạnh AI"** để điều chỉnh thời gian suy nghĩ:
- **0.5s** — Nhanh, chơi vui
- **3s** — Mặc định, chơi tốt  
- **10s** — Mạnh nhất, tìm kiếm sâu

## 📄 License

MIT License — Tự do sử dụng và sửa đổi.
