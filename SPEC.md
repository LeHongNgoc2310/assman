# ASSETLY — Feature Specification
## Khai Sinh Tài Khoản (Bổ Sung Phí & Tiểu Khoản) & Quản Lý Giao Dịch Thủ Công

> **Mục đích**: Tài liệu đặc tả đầy đủ gồm User Story + AC (Gherkin) + Use Case (13 trường)  
> dành cho vibe coding trên Google AI Studio (Gemini).  
> **Tech stack**: React + FastAPI + Supabase + Vnstock + Gemini Vision API  
> **Ngày cập nhật**: 2026-06-02  
> **PO**: Lê Hồng Ngọc — Pinetree Securities

---

## MỤC LỤC

1. [Tổng Quan Tính Năng](#1-tổng-quan-tính-năng)
2. [Data Model](#2-data-model)
3. [Business Rules](#3-business-rules)
4. [US-ONBOARD-001: Khai Báo Phí & Tiểu Khoản Khi Nạp Tài Sản Lần Đầu](#4-us-onboard-001)
5. [US-ONBOARD-002: Thêm Tiểu Khoản Mới Vào Tài Khoản CTCK Đã Khai Sinh](#5-us-onboard-002)
6. [US-ONBOARD-003: Chỉnh Sửa Phí Của Tiểu Khoản Sau Khai Sinh](#6-us-onboard-003)
7. [US-TRADE-001: Nhập Giao Dịch Mua Thủ Công](#7-us-trade-001)
8. [US-TRADE-002: Nhập Giao Dịch Bán Thủ Công](#8-us-trade-002)
9. [UC-ONBOARD-01: Set Up Brokerage Account](#9-uc-onboard-01)
10. [UC-ONBOARD-02: Add Sub-Account to Existing Broker](#10-uc-onboard-02)
11. [UC-TRADE-01: Record Manual Buy Transaction](#11-uc-trade-01)
12. [UC-TRADE-02: Record Manual Sell Transaction](#12-uc-trade-02)
13. [Sample Test Data (Python / JavaScript)](#13-sample-test-data)

---

## 1. Tổng Quan Tính Năng

### Bối Cảnh

ASSETLY hỗ trợ tính năng **Quản Lý CTCK** giúp nhà đầu tư thiết lập và nạp tài sản qua các phương thức: trích xuất OCR hóa đơn/ảnh chụp (Gemini Vision), import file Excel/CSV, hoặc nhập tay từng vị thế. Để đảm bảo giá vốn, phí giao dịch và P&L được tính toán chính xác tuyệt đối, hệ thống bổ sung quản lý phí giao dịch và chia tách luồng theo các tiểu khoản.

Sau khi khai sinh tài khoản broker chính, người dùng có thể:
- Thêm các tiểu khoản chuyên biệt (Margin, Phái Sinh, Trái Phiếu, Thường) dưới cùng một broker.
- Nhập các lệnh giao dịch Mua/Bán thủ công để tự động điều chỉnh cơ cấu tài sản, danh mục nắm gửi và số dư tiền mặt của tiểu khoản đó theo thời gian thực.
- Xem tổng hợp P&L đã thực hiện (Realized P&L) trực tiếp trên Dashboard chính của ứng dụng.

### Cấu Trúc Tài Khoản (Data Hierarchy)

```
BrokerConnection (1 per broker, e.g. "SSI")
└── SubAccount (N per broker, e.g. "Thường", "Margin")
    ├── cash_balance
    ├── fee_rate
    ├── holdings[]
    └── transactions[]
```

- `BrokerConnection`: đại diện cho kết nối nhà môi giới (như SSI, TCBS, Pinetree), chứa nickname và thông tin định dạng.
- `SubAccount`: tiểu khoản đầu tư chi tiết (Thường, Margin, Phái Sinh, Trái Phiếu) thuộc BrokerConnection tương ứng, sở hữu số dư tiền mặt, biểu phí giao dịch, danh mục nắm giữ (Holdings) và lịch sử giao dịch riêng biệt.

### Scope Tính Năng

| Feature | Story | Mô Tả |
|---------|-------|--------|
| FEAT-A | US-ONBOARD-001 | Bổ sung khai phí + tiểu khoản vào luồng thiết lập ban đầu |
| FEAT-A | US-ONBOARD-002 | Thêm tiểu khoản mới vào broker đã có (qua modal ✏️) với tính năng nạp dữ liệu ban đầu một lần duy nhất |
| FEAT-A | US-ONBOARD-003 | Chỉnh sửa biểu phí giao dịch của một tiểu khoản cụ thể |
| FEAT-B | US-TRADE-001 | Nhập giao dịch Mua thủ công — tự động cập nhật Holding, tính lại giá vốn bình quân gia quyền và điều chỉnh tiền mặt (hiển thị popup đồng bộ tiền nếu thiếu) |
| FEAT-B | US-TRADE-002 | Nhập giao dịch Bán thủ công — chọn mã từ danh mục sở hữu, tính P&L thực hiện chi tiết (gồm phí + 0.1% thuế bán), cập nhật tiền mặt và hiển thị P&L tổng hợp lên Dashboard |

### Ngoài Scope (Không thực hiện ở phase này)
- Sửa hoặc xóa các giao dịch thủ công đã khớp (giao dịch là immutable - bất biến sau khi xác nhận)
- Kết nối API lấy dữ liệu giao dịch realtime của các CTCK
- Gợi ý phí giao dịch mặc định theo CTCK (ví dụ TCBS 0.1%, SSI 0.15% - không triển khai)

---

## 2. Data Model

```typescript
// Enum tiểu khoản
type SubAccountType = 'THUONG' | 'MARGIN' | 'PHAI_SINH' | 'TRAI_PHIEU';

// Lớp 1: Kết nối Broker (1 per broker per user)
interface BrokerConnection {
  id: string;                          // UUID
  user_id: string;
  broker: 'SSI' | 'TCBS' | 'PINETREE' | string;
  broker_nickname: string;             // VD: "Tài khoản SSI của tôi"
  created_at: string;
  updated_at: string;
}

// Lớp 2: Tiểu khoản thuộc BrokerConnection (UNIQUE cho cặp broker_connection_id và sub_account_type)
interface SubAccount {
  id: string;                          // UUID
  broker_connection_id: string;        // FK → BrokerConnection
  sub_account_type: SubAccountType;    // Thường / Margin / Phái Sinh / Trái Phiếu
  nickname: string;                    // VD: "Tích sản SSI - Thường"
  fee_rate: number;                    // % phí giao dịch, vd: 0.15
  tax_rate: number;                    // % thuế bán, mặc định 0.1 (cố định)
  cash_balance: number;                // VND, tự động tính lại sau mỗi giao dịch
  is_initial_loaded: boolean;          // Đã thực hiện nạp dữ liệu ban đầu chưa (chỉ cho phép OCR/Excel/Nhập tay 01 lần duy nhất khi khai báo)
  created_at: string;
  updated_at: string;
}

// Vị thế nắm giữ chi tiết của tiểu khoản
interface Holding {
  id: string;
  sub_account_id: string;              // FK → SubAccount
  symbol: string;
  quantity: number;                    // Số lượng nắm giữ (Với Phái sinh được tính bằng Số hợp đồng)
  avg_cost: number;                    // Giá vốn bình quân gia quyền (WAC) (VND/cổ phiếu hoặc VND/hợp đồng)
  total_cost: number;                  // = quantity × avg_cost
  last_updated: string;
}

// Giao dịch thủ công (bất biến sau khi ghi nhận)
interface ManualTransaction {
  id: string;
  sub_account_id: string;              // FK → SubAccount
  type: 'BUY' | 'SELL';
  symbol: string;
  quantity: number;                    // Số lượng (với Phái sinh là Số hợp đồng)
  price: number;                       // Đơn giá khớp (VND)
  fee_rate: number;                    // % phí tại thời điểm giao dịch
  fee_amount: number;                  // Tiền phí giao dịch thực tế
  tax_rate: number;                    // Thuế suất bán (bằng 0 nếu BUY, cố định 0.1 nếu SELL)
  tax_amount: number;                  // Tiền thuế bán thực tế
  net_amount: number;                  // Giá trị ròng (BUY: -(qty×price + fee) | SELL: qty×price - fee - tax)
  realized_pnl: number;                // 0 nếu BUY; tính khi SELL dựa trên giá vốn bình quân của Holding
  trade_date: string;                  // yyyy-mm-dd
  note: string;
  confirmed_at: string;                // Server-side timestamp ghi nhận giao dịch
  created_at: string;
}
```

---

## 3. Business Rules

### BR-001: Công Thức Giao Dịch Tài Chính

* **Lệnh MUA (BUY):**
  ```
  fee_amount  = quantity × price × (fee_rate / 100)
  net_amount  = -(quantity × price + fee_amount)     ← Dòng tiền ra (-)
  tax_amount  = 0
  ```

* **Lệnh BÁN (SELL):**
  ```
  fee_amount  = quantity × price × (fee_rate / 100)
  tax_amount  = quantity × price × 0.1 / 100         ← Thuế suất 0.1% cố định theo quy định
  net_amount  = (quantity × price) - fee_amount - tax_amount  ← Dòng tiền vào (+)
  ```

### BR-002: Giá Vốn Bình Quân Gia Quyền (WAC) & Realized P&L

* **Mỗi khi ghi nhận lệnh MUA:**
  ```
  new_quantity   = old_quantity + buy_quantity
  new_total_cost = old_total_cost + (buy_quantity × price) + fee_amount
  new_avg_cost   = new_total_cost / new_quantity
  ```

* **Mỗi khi ghi nhận lệnh BÁN:**
  ```
  realized_pnl   = (price - avg_cost) × sell_qty - fee_amount - tax_amount
  new_quantity   = old_quantity - sell_quantity
  new_total_cost = avg_cost × new_quantity     ← Giá vốn trung bình không đổi khi bán
  ```
  *Nếu `new_quantity == 0`*, bản ghi Holding của mã CK đó trong tiểu khoản sẽ được xóa hoàn toàn.

### BR-003: Điều Chỉnh Tiền Mặt
Mỗi giao dịch thủ công sau khi khớp sẽ tự động làm thay đổi tiền mặt của tiểu khoản:
```
cash_balance = cash_balance + net_amount   (net_amount mang giá trị âm khi MUA, dương khi BÁN)
```

### BR-004: Popup Đồng Bộ Tiền Mặt Khi Nạp Lệnh Mua
Khi người dùng chuẩn bị nạp lệnh Mua và `tổng chi phí mua > số dư cash_balance hiện tại` của tiểu khoản:
1. Hệ thống tạm dừng chuyển sang màn hình Xác Nhận Lệnh.
2. Hiển thị popup **"Cập Nhật Số Dư Thực Tế"** yêu cầu người dùng xác nhận hoặc sửa lại số dư khả dụng thực tế của tài khoản tại CTCK.
3. Sau khi người dùng xác nhận số dư thực tế mới, hệ thống cập nhật `cash_balance` và chuyển hướng mượt mà tiếp tục quy trình Xác Nhận Lệnh.

### BR-005: Ràng Buộc Mã Giao Dịch Khi Bán
Khi tạo lệnh BÁN, người dùng không cần và không được nhập tự do mà chỉ được phép chọn mã chứng khoán từ **Dropdown danh mục đang sở hữu** (có `quantity > 0` trong tiểu khoản tương ứng).

### BR-006: Giới Hạn Bội Số Số Lượng & Đơn Vị Đo Lường
- **Tiểu khoản Thường / Margin / Trái Phiếu**: Số lượng giao dịch phải là bội số của **100** (theo quy định lô tối thiểu sàn HOSE/HNX). Đơn vị đo lường là **Cổ phiếu (Shares)**.
- **Tiểu khoản Phái Sinh (Derivatives)**: Số lượng giao dịch tối thiểu là **1** và là bội số của **1**. Đơn vị đo lường tương ứng là **Số hợp đồng (Contracts)**.

### BR-007: Khai Báo Tiểu Khoản Mới & Khóa Luồng Import Ban Đầu
* Đối với tiểu khoản mới tạo, người dùng có thể nạp danh mục ban đầu một lần duy nhất (`is_initial_loaded = false`) thông qua OCR, Import Excel/CSV hoặc Nhập tay danh sách vị thế.
* Sau khi xác nhận lưu đợt dữ liệu ban đầu thành công, tiểu khoản được đánh dấu `is_initial_loaded = true`. Các tab/luồng import đối với tiểu khoản này sẽ bị khóa hoàn toàn (lưu giữ trạng thái danh mục ban đầu cố định).
* Mọi thay đổi dữ liệu từ thời điểm này trở đi chỉ được thực hiện thông qua các lệnh Mua/Bán thủ công hoặc nạp rút tiền tay, nhằm bảo toàn chuỗi dữ liệu giao dịch chi tiết phục vụ tính P&L.

### BR-008: Tổng Hợp Dashboard
Toàn bộ khoản lãi/lỗ đã thực hiện (`realized_pnl` tích lũy) của tất cả tiểu khoản sẽ được tổng hợp đầy đủ và hiển thị minh bạch tại màn hình Dashboard chính dưới mục **"Tổng P&L đã thực hiện"**.

---

## 4. US-ONBOARD-001
### Khai Báo Phí & Tiểu Khoản Khi Nạp Tài Sản Lần Đầu

* **As a** Nhà đầu tư đăng ký tài khoản CTCK mới trên ASSETLY
* **I want to** chọn loại tiểu khoản và thiết lập phí giao dịch ngay khi nạp tài sản lần đầu (qua OCR / Excel / Nhập tay)
* **So that** hệ thống tự động thiết lập cấu trúc tài khoản chuẩn chỉ và tính đúng giá vốn bình quân ngay tức thì.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria)

* **AC1: Thêm phần cấu hình tiểu khoản vào cuối quy trình trích xuất OCR**
  - Sau khi OCR trích xuất vị thế thành công và người dùng bấm nạp dữ liệu.
  - Form hiển thị thêm mục **"Cấu hình tiểu khoản"** gồm:
    * Dropdown **Loại tiểu khoản**: Thường (Default) | Margin | Phái Sinh | Trái Phiếu (Bắt buộc).
    * Ô nhập **Phí giao dịch (%)**: Giới hạn từ `0.01%` đến `1.0%` (Bắt buộc).
    * Nhãn cố định: "Thuế bán: 0.1% (Mặc định cố định)".
  - Người dùng điền và chọn đầy đủ trước khi lưu thành công.

* **AC2: Thêm phần cấu hình vào form Import Excel/CSV và Nhập tay danh mục**
  - Tương tự AC1, màn hình preview trước khi xác nhận lưu vị thế từ tệp tin Excel hoặc danh mục nhập thủ công đều hiển thị panel cấu hình tiểu khoản này ở vị trí trực quan phía trên.

* **AC3: Lưu trữ dữ liệu chuẩn 2 lớp**
  - Khi lưu, hệ thống tự động tạo một `BrokerConnection` ứng với tên nhà môi giới được chọn (nếu chưa có).
  - Khởi tạo `SubAccount` chứa loại tiểu khoản, phí giao dịch được nhập, thuế 0.1% và đánh dấu `is_initial_loaded = true` đồng thời lưu các `Holding` ban đầu.

---

## 5. US-ONBOARD-002
### Thêm Tiểu Khoản Mới Vào Tài Khoản CTCK Đã Khai Sinh

* **As a** Nhà đầu tư đã sở hữu tài khoản SSI (tiểu khoản Thường) trên ASSETLY
* **I want to** thêm tiểu khoản Margin hoặc Phái Sinh mà không phải khai sinh lại connection SSI mới
* **So that** theo dõi danh mục và sức mua độc lập của từng tiểu khoản một cách thuận tiện.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria)

* **AC1: Giao diện thêm tiểu khoản linh hoạt**
  - Khi chọn nút điều chỉnh ✏️ của tài khoản chính (BrokerConnection), hệ thống hiển thị danh sách các tiểu khoản hiện hữu kèm nút **"+ Thêm tiểu khoản"**.
  - Form thêm tiểu khoản cung cấp các tùy chọn:
    * Dropdown loại tiểu khoản: Chỉ hiển thị các loại **chưa tồn tại** dưới sàn môi giới này (Ví dụ nếu đã có Thường, chỉ được chọn Margin, Phái Sinh hoặc Trái Phiếu).
    * Phí giao dịch (%).
    * Sức mua / số dư tiền ban đầu (Mặc định bằng 0 nếu trống).
    * Lựa chọn: Khởi tạo tiểu khoản trống hoặc Nạp vị thế ban đầu (OCR/Excel/Nhập vị thế - chỉ hiển thị và cho phép nạp 01 lần tại bước đăng ký này).

* **AC2: Block các cấu trúc trùng lặp**
  - Nếu BrokerConnection đã sở hữu đủ cả 4 loại tiểu khoản, nút bấm Thêm tiểu khoản sẽ bị ẩn hoặc vô hiệu hóa.

---

## 6. US-ONBOARD-003
### Chỉnh Sửa Biểu Phí Của Tiểu Khoản Sau Khai Sinh

* **As a** Người dùng có tiểu khoản giao dịch trên ASSETLY
* **I want to** sửa đổi trực tiếp biểu phí giao dịch của tiểu khoản bất cứ lúc nào
* **So that** các giao dịch ghi nhận mới về sau tự động áp dụng biểu phí cập nhật mà không ảnh hưởng tới dữ liệu lịch sử.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria)

* **AC1: Chỉnh sửa nhanh phí giao dịch**
  - Trong cài đặt tài khoản, người dùng có thể nhấp ✏️ bên cạnh dòng tiểu khoản tương ứng để chỉnh sửa inline giá trị phí giao dịch.
  - Phí hợp lệ phải nằm từ `0.01%` đến `1.0%`.
  - Các giao dịch mới tạo sau thời điểm này sẽ dùng tỷ lệ phí mới, các giao dịch cũ đã xác nhận vẫn giữ nguyên giá trị phí và thuế gốc tại thời điểm khớp lịch sử.

---

## 7. US-TRADE-001
### Nhập Giao Dịch Mua Thủ Công & Popup Đồng Bộ Tiền

* **As a** Nhà đầu tư vừa khớp lệnh Mua cổ phiếu thực tế
* **I want to** nhập tay lệnh Mua vào tiểu khoản tương ứng trên ASSETLY
* **So that** hệ thống tự động gia tăng danh mục, tính lại giá vốn bình quân gia quyền và trừ tiền mặt chuẩn xác.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria)

* **AC1: Form Mua trực quan & Logic tính toán**
  - Form quy định nhập: Mã CK, Số lượng, Giá khớp, Ngày mua, Ghi chú và biểu phí (tự điền theo phí tiểu khoản, khớp chỉnh sửa nếu cần).
  - Kiểm tra điều kiện số lượng: Phải là bội số của 100 đối với Thường/Margin; bội số của 1 đối với Phái sinh (hợp đồng).
  - Màn hình **Xác Nhận Lệnh** hiển thị rõ ràng: Tổng giá trị khớp, Tiền phí tương ứng, Tổng tiền chi thực tế và Giá vốn bình quân mới dự kiến sau khi lưu.

* **AC2: Popup đồng bộ số dư tiền khả dụng**
  - Nếu tổng tiền chi của lệnh mua lớn hơn số dư tiền mặt ròng hiện tại (`cash_balance`) của tiểu khoản:
    * Hệ thống kích hoạt ngăn chặn chuyển hướng Xác Nhận Lệnh, bật popup **"Cập Nhật Số Dư Thực Tế"**.
    * Popup hiển thị: Số dư ASSETLY hiện tại, Giá trị mua yêu cầu và một ô nhập số dư thực tế.
    * Sau khi nhập số dư mới, hệ thống cập nhật tiền mặt và tự động chuyển tiếp tới màn hình Xác Nhận Lệnh.

---

## 8. US-TRADE-002
### Nhập Giao Dịch Bán Thủ Công & Tính Realized P&L

* **As a** Nhà đầu tư thực hiện bán bớt cổ phiếu tích lũy
* **I want to** nhập lệnh Bán bằng cách chọn mã từ dropdown holdings hiện hữu của tiểu khoản
* **So that** hệ thống tự động ghi nhận lợi nhuận/thua lỗ thực tế (Realized P&L), khấu trừ số lượng và cộng tiền mặt tích lũy.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria)

* **AC1: Dropdown giới hạn mã bán**
  - Trường Mã CK bắt buộc là một **Dropdown** hiển thị danh sách các mã đang sở hữu của tiểu khoản đó kèm số lượng nắm giữ hiện hành (Ví dụ: "HPG (500 CP)"). Không cho phép nhập tay tự do.

* **AC2: Tính Toán Lợi Nhuận & Thuế**
  - Thuế suất bán luôn cố định là **0.1%** áp trên tổng giá trị khớp lệnh bán (`quantity × price`).
  - Phí bán tính theo biểu phí giao dịch của tiểu khoản.
  - Lợi nhuận thực khớp (`realized_pnl`) được hạch toán chặt chẽ:
    ```
    realized_pnl = (giá bán - giá vốn bình quân) × số lượng bán - phí bán - thuế bán 0.1%
    ```
  - Màn hình xác nhận hiển thị chi tiết số tiền thuần thu về, khoản P&L thực tế bằng số tiền VND và tỷ lệ % lợi nhuận so với giá vốn mua.

* **AC3: Cập nhật cơ cấu & Đẩy P&L lên Dashboard**
  - Sau khi xác nhận bán:
    * Khấu trừ số lượng chứng khoán trong Holding (Nếu bằng 0 thì bỏ hẳn mã khỏi Holdings của tiểu khoản).
    * Cộng tiền thuần bán được vào `cash_balance` của tiểu khoản.
    * Cộng dồn lợi nhuận thực vào tổng P&L trên Dashboard chính.

---

## 9. UC-ONBOARD-01
### Set Up Brokerage Account with Fee and Sub-Account Configuration

* **Use Case ID**: UC-ONBOARD-01
* **Use Case Name**: Set up brokerage account with fee and sub-account configuration
* **Actor**: Investor
* **Description**: Người dùng thiết lập tài khoản CTCK chính và thực hiện nạp danh mục ban đầu thành công qua một trong các cách thức nạp tài sản (OCR/Excel/Manual Ingestion). Luồng kết thúc khi BrokerConnection và SubAccount đầu tiên được lưu kèm các vị thế và phí giao dịch chi tiết.
* **Preconditions**: Tài khoản đích thuộc danh sách broker được hỗ trợ và ít nhất một vị thế tài sản được ghi nhận tạm thời trong preview.
* **Postconditions**: Tạo BrokerConnection, tạo SubAccount có `fee_rate` và tiền mặt ban đầu, tạo các bản ghi Holdings tương thích, hiển thị thẻ tài khoản trên màn hình chính.

---

## 10. UC-ONBOARD-02
### Add Sub-Account to Existing Broker Connection

* **Use Case ID**: UC-ONBOARD-02
* **Use Case Name**: Add sub-account to existing broker connection
* **Actor**: Investor
* **Description**: Cho phép nhà đầu tư tích hợp thêm các tiểu khoản khác (Thường, Margin, Phái Sinh, Trái Phiếu) dưới một broker chính đã có của họ.
* **Normal Course**: Người dùng click nút ✏️ chỉnh sửa tài khoản chính -> Chọn "+" để thêm tiểu khoản -> Điền loại tiểu khoản, phí và nạp vị thế ban đầu 01 lần duy nhất (hoặc chọn tạo trống) -> Lưu thành công.

---

## 11. UC-TRADE-01
### Record Manual Buy Transaction

* **Use Case ID**: UC-TRADE-01
* **Use Case Name**: Record manual buy transaction
* **Actor**: Investor
* **Description**: Ghi nhận giao dịch mua của nhà đầu tư, thực hiện quy trình kiểm tra số dư khả dụng, tính toán lại giá vốn bình quân gia quyền của holdings và cập nhật tiền mặt.

---

## 12. UC-TRADE-02
### Record Manual Sell Transaction

* **Use Case ID**: UC-TRADE-02
* **Use Case Name**: Record manual sell transaction
* **Actor**: Investor
* **Description**: Ghi nhận lệnh bán chứng khoán, tính toán lợi nhuận/thua lỗ thực tế đã chốt (Realized P&L) kèm biểu trừ phí bán và 0.1% thuế bán cố định, đồng thời cập nhật dòng tiền và holdings còn lại.

---

## 13. Sample Test Data

### Ví dụ 1: Tính lệnh Mua cổ phiếu VHM (Lần đầu)
* **Thông số đầu vào**: 
  - Tiền mặt hiện tại: `45,000,000 VND`
  - Vị thế VHM: Chưa có
  - Lệnh Mua: `1,000 CP VHM` | Giá mua: `40,000 VND` | Phí: `0.15%`
* **Tính toán kết quả**:
  - Giá trị mua khớp = `1,000 × 40,000 = 40,000,000 VND`
  - Tiền phí giao dịch = `40,000,000 × 0.15 / 100 = 60,000 VND`
  - Tổng số tiền thực chi (Net Amount) = `-40,060,000 VND`
  - Giá vốn bình quân của VHM (WAC) = `40,060 VND/CP`
  - Số dư tiền mặt còn lại = `45,000,000 - 40,060,000 = 4,940,000 VND`

### Ví dụ 2: Tính lệnh Mua gom thêm VHM (Tính lại WAC)
* **Thông số đầu vào**:
  - Vị thế VHM đang có: `1,000 CP` | Giá vốn cũ: `40,060 VND/CP` (Tổng giá trị cũ: `40,060,000 VND`)
  - Lệnh Mua thêm: `500 CP VHM` | Giá mua mới: `42,000 VND` | Phí: `0.15%`
* **Tính toán kết quả**:
  - Giá trị mua khớp mới = `500 × 42,000 = 21,000,000 VND`
  - Tiền phí mua mới = `21,000,000 × 0.15 / 100 = 31,500 VND`
  - Chi phí đợt nạp mới = `21,031,500 VND`
  - Tổng số lượng mới = `1,000 + 500 = 1,500 CP`
  - Tổng giá trị tích lũy mới = `40,060,000 + 21,031,500 = 61,091,500 VND`
  - **Giá vốn bình quân mới (WAC)** = `61,091,500 / 1,500 = 40,727.67 VND/CP` (Làm tròn đến 2 chữ số thập phân)

### Ví dụ 3: Tính lệnh Bán chốt lời VHM (Một phần)
* **Thông số đầu vào**:
  - Vị thế VHM hiện có: `1,500 CP` | Giá vốn hiện tại: `40,727.67 VND/CP`
  - Lệnh Bán: `500 CP VHM` | Giá bán: `45,000 VND` | Phí bán: `0.15%` | Thuế bán mặc định: `0.1%` (Cố định)
* **Tính toán kết quả**:
  - Giá trị bán thu được = `500 × 45,000 = 22,500,000 VND`
  - Tiền phí môi giới bán = `22,500,000 × 0.15 / 100 = 33,750 VND`
  - Tiền thuế thu nhập bán = `22,500,000 × 0.1 / 100 = 22,500 VND`
  - Số tiền thuần nhận về (Net proceeds) = `22,500,000 - 33,750 - 22,500 = 22,443,750 VND`
  - Giá trị vốn gốc của lô sản phẩm bán = `500 × 40,727.67 = 20,363,835 VND`
  - **Lãi chốt thực hiện (Realized P&L)** = `22,443,750 - 20,363,835 = 2,079,915 VND` (Lãi ròng sau thuế phí, đạt hiệu quả tương ứng **+10.21%** so với vốn gốc bỏ ra)
  - Vị thế VHM còn lại: `1,000 CP` | Giá vốn bình quân không đổi: `40,727.67 VND/CP`

---
*Tài liệu đặc tả được cấu trúc chặt chẽ bảo toàn tính logic, nhất quán để kiểm thử và triển khai.*
