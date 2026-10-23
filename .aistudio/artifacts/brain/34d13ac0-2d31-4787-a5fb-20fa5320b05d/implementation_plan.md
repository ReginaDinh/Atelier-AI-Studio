# Hệ thống Nghiên cứu Đa Tác tử & Kiểm chứng Chéo (Multi-Agent Autonomous Research Lab)

Nâng cấp toàn diện công cụ **Deep Research** và chuyên gia **Research Scholar** thành một phòng thí nghiệm nghiên cứu đa tác tử tự hành gồm 5 giai đoạn phối hợp liền mạch, kết hợp điều tra song song, đối chiếu chéo dữ kiện (Cross-Check), phản biện đối kháng (Adversarial Peer Review - Reviewer #2) và tự sửa lỗi logic trước khi xuất bản bài nghiên cứu đạt chuẩn quốc tế.

## Quyết định Thiết kế đã Xác nhận từ Người dùng

> [!IMPORTANT]
> Toàn bộ 3 nhóm tùy chọn chiến lược đã được xác nhận và tích hợp đầy đủ vào kiến trúc triển khai:

- **Cơ chế vận hành Multi-Agent**: Chạy tự động liền mạch qua 5 giai đoạn phối hợp giữa các Agent chuyên biệt (hiển thị tiến độ trực tiếp theo thời gian thực trên giao diện).
- **4 Bảng Kiểm định & Phản biện Trực quan trên Giao diện**:
  1. **Ma trận Kiểm tra chéo Sự thật & Nguồn tin (Cross-Check & Verification Matrix 2024–2026)**: Đối chiếu các tuyên bố giữa các nhánh điều tra, xác thực độ mới và mức độ đồng thuận của nguồn tin.
  2. **Biên bản Phản biện Đối kháng "Reviewer #2" & Tự sửa lỗi (Adversarial Peer Review & Self-Correction Log)**: Chỉ rõ các điểm yếu phương pháp luận/logic bị phát hiện và cách hệ thống đã tự gia cố.
  3. **Bảng Tổng hợp Công trình SOTA (Literature Review & SOTA Comparison Matrix)**: Bảng đối sánh các phương pháp/nghiên cứu tiêu biểu, ưu nhược điểm và khoảng trống nghiên cứu (Research Gap).
  4. **Bảng Chấm điểm Chất lượng Nghiên cứu (Quality Rubric 0–100)**: Đánh giá định lượng 4 trụ cột: *Tính mới (Novelty)*, *Độ chặt chẽ Logic/Phương pháp (Methodological Rigor)*, *Độ phủ Toàn diện (Completeness)* và *Độ tin cậy Nguồn tin (Source Verifiability)*.
- **Định dạng Đầu ra Linh hoạt**: Tự động nhận diện và cho phép chuyển đổi linh hoạt giữa cấu trúc **Bài báo Khoa học Quốc tế IMRaD (Scopus/ISI Q1)** và **Báo cáo Phân tích Chiến lược Chuyên sâu (Executive Deep Report)**, kèm nút **"Đào sâu Vòng tiếp theo (Iterative Deepening)"**.

---

## 1. Tổng quan & Giá trị Cốt lõi

- **Giải quyết triệt để hạn chế của AI nghiên cứu truyền thống**: Thay vì chỉ sinh một bài viết dài trong một lần gọi dễ dẫn đến thông tin chung chung, thiếu chiều sâu hoặc mâu thuẫn nội tại, hệ thống chia nhỏ quy trình cho các Agent có vai trò đối lập nhau (Điều tra viên vs. Kiểm toán viên vs. Phản biện viên Reviewer #2).
- **Đảm bảo 3 tiêu chuẩn vàng của bài nghiên cứu**:
  - **Tính Mới nhất (State-of-the-Art & Recency)**: Ưu tiên truy vấn Google Search Grounding cho các công trình, số liệu và đột phá giai đoạn 2024–2026; phát hiện rõ *Research Gap* (những gì các công trình trước chưa giải quyết được).
  - **Tính Hợp lý & Chặt chẽ (Logical & Methodological Validity)**: Mọi luận điểm đều phải đi qua bộ lọc kiểm tra chéo (Cross-Check) và vượt qua đòn tấn công phản biện của *Reviewer #2* trước khi được đưa vào bản thảo cuối.
  - **Tính Đầy đủ & Toàn diện (MECE Completeness)**: Bao phủ từ cơ sở lý thuyết, toán học/thuật toán, dữ liệu thực nghiệm, bảng so sánh SOTA cho đến giới hạn nghiên cứu (Limitations) và hướng phát triển tương lai.

---

## 2. Kiến trúc Phối hợp 5 Giai đoạn Đa Tác tử (Multi-Agent Pipeline)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    YÊU CẦU NGHIÊN CỨU TỪ NGƯỜI DÙNG (USER QUERY)                  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: CHIEF RESEARCH ARCHITECT (Kiến trúc sư Đề tài & Khoảng trống SOTA)   │
│ • Xác định Định dạng tối ưu (Academic IMRaD Q1 Paper vs. Strategic Deep Report)   │
│ • Phát hiện Khoảng trống Nghiên cứu (Research Gap) & Đặt Giả thuyết gốc (Thesis)  │
│ • Phân rã thành 4 Mũi điều tra chuyên sâu chuẩn MECE (Lý thuyết, Thực nghiệm,     │
│   Thách thức/Biến nhiễu, Kiến trúc/Ứng dụng)                                      │
└───────────────────┬───────────────────────────────────────────┬───────────────────┘
                    ▼                                           ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│ GIAI ĐOẠN 2A: THEORETICAL & SOTA      │   │ GIAI ĐOẠN 2B: EMPIRICAL & BENCHMARK   │
│ INVESTIGATOR (Điều tra Lý thuyết)     │   │ INVESTIGATOR (Điều tra Thực nghiệm)   │
│ • Thu thập nguyên lý, mô hình toán,   │   │ • Truy xuất số liệu thực tế 2024-2026,│
│   kiến trúc hệ thống & bảng SOTA      │   │   case studies, thống kê & trích dẫn  │
└───────────────────┬───────────────────┘   └───────────────────┬───────────────────┘
                    └─────────────────────┬─────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: CROSS-CHECK & FACT AUDITOR (Kiểm toán Đối chiếu Chéo & Nguồn tin)    │
│ • Đối chiếu chéo phát hiện giữa Nhánh Lý thuyết & Nhánh Thực nghiệm               │
│ • Lập Ma trận Cross-Check: Xác nhận (Verified) / Hiệu chỉnh (Calibrated) /        │
│   Loại bỏ suy diễn thiếu căn cứ & Xây dựng Literature Review Matrix (SOTA Table) │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: ADVERSARIAL PEER REVIEWER "REVIEWER #2" (Phản biện & Tự sửa lỗi)     │
│ • Tấn công trực diện vào lỗ hổng phương pháp luận, biến nhiễu & thiên kiến        │
│ • Tạo Biên bản Sửa đổi (Critique -> Self-Correction Action)                       │
│ • Chấm điểm Rubric (0-100): Novelty · Rigor · Completeness · Source Verifiability │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 5: PRINCIPAL EDITOR & SYNTHESIZER (Tổng biên tập Xuất bản)              │
│ • Stream bản thảo hoàn chỉnh đã khắc phục toàn bộ phản biện của Reviewer #2       │
│ • Bao gồm: Abstract/Executive Summary, CARS/IMRaD Sections, Bảng SOTA,            │
│   Công thức LaTeX ($$...$$), Sơ đồ Kiến trúc Mermaid & Danh mục Nguồn xác thực    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Thiết kế Giao diện & Trải nghiệm Tương tác (`DeepResearchTracker` Nâng cấp)

Giao diện **Multi-Agent Deep Research Console** hiển thị ngay phía trên bài nghiên cứu được thiết kế sắc nét, tương thích hoàn toàn với cả 6 chủ đề giao diện (Editorial Warm, Obsidian Dark, Nordic Midnight, v.v.):

1. **Thanh Trạng thái Tiến trình 5 Giai đoạn & Chỉ số Chất lượng (Header & Score Strip)**:
   - Hiển thị tiến độ trực tiếp của 5 giai đoạn Agent đang hoạt động.
   - Hiển thị 4 chỉ số đánh giá định lượng (`tabular-nums`):
     - **Novelty (Tính mới)**: `0–100`
     - **Rigor (Độ chặt chẽ)**: `0–100`
     - **Completeness (Độ toàn diện)**: `0–100`
     - **Overall Quality Score**: Điểm tổng hợp trung bình.
2. **Hệ thống 4 Tab Kiểm định Chuyên sâu (Interactive Inspection Tabs)**:
   - **Tab 1 — Tiến trình & Phát hiện của các Agent (`Agent Pipeline & Findings`)**: Hiển thị Khoảng trống nghiên cứu (*Research Gap*), Giả thuyết trung tâm (*Core Hypothesis*) và kết quả điều tra của từng mũi nghiên cứu.
   - **Tab 2 — Ma trận Kiểm tra Chéo & Nguồn tin (`Cross-Check Matrix`)**: Bảng đối chiếu từng luận điểm quan trọng, trạng thái kiểm chứng (*Verified / Refined*), nguồn đối chiếu 2024–2026 và độ tin cậy.
   - **Tab 3 — Biên bản Phản biện Reviewer #2 (`Peer Review & Self-Correction`)**: Liệt kê từng nhận xét khắt khe của *Reviewer #2* (mức độ nghiêm trọng *Major / Minor*), điểm yếu phát hiện và cách Tổng biên tập đã tự động sửa chữa, gia cố trong bài viết cuối.
   - **Tab 4 — Bảng Đối sánh Công trình SOTA (`Literature & SOTA Matrix`)**: Bảng tổng hợp các phương pháp/công trình tiêu biểu, cơ chế cốt lõi, ưu điểm, hạn chế và khoảng trống mà bài nghiên cứu hiện tại giải quyết.
3. **Thanh Công cụ Tác động Hậu kỳ (Post-Research Action Bar)**:
   - **Đào sâu Vòng 2 (`Iterative Deepening`)**: Nút 1-click cho phép yêu cầu dàn Agent đào sâu tiếp vào các câu hỏi mở hoặc các giới hạn nghiên cứu vừa phát hiện.
   - **Đưa thẳng vào Interactive Canvas**: Mở toàn bộ bài nghiên cứu trong bảng Canvas để chỉnh sửa từng đoạn hoặc xuất bản.
