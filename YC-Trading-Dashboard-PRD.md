# YC Strategic Dashboard — Product Requirements Document

> *"Quẻ nhìn thấy trước khi chart chạy. Chart xác nhận điều quẻ đã nói."*

## 1. Vision

Một AI-powered trading dashboard dành cho **traders và investors** — kết hợp **Technical Analysis + Kinh Dịch (Mai Hoa Dịch Số)** vào một giao diện duy nhất. Đây không phải dashboard bình thường — đây là **quân sư số**, đồng hành mỗi ngày, mỗi phiên, mỗi quyết định.

**Tên sản phẩm:** YC Strategic Dashboard
**Tagline:** *"Where Ancient Wisdom Meets Modern Markets"*

---

## 2. Target Users

| Persona | Mô tả | Pain Point |
|---------|--------|------------|
| **Active Trader** | Day/swing trader, options, dùng TradingView | Cần bias nhanh đầu ngày, levels rõ ràng, timing entry/exit |
| **Investor** | Hold mid-long term, portfolio allocation | Cần macro view, sector rotation, timing entry dài hạn |
| **Dịch Học Trader** | Kết hợp I Ching/Mai Hoa với TA | Cần quẻ tự động, luận giải, khớp với chart data |

---

## 3. Core Modules

### 3.1. Market Pulse (Tổng Quan Thị Trường)

**Mục đích:** Một cái nhìn toàn cảnh trong 5 giây.

| Component | Data Source | Hiển thị |
|-----------|------------|----------|
| **Major Indices** | API (Yahoo Finance / Alpha Vantage / Polygon) | SPY, QQQ, DIA, IWM — giá, %, change |
| **VIX** | API | Gauge meter: <15 Greed, 15-25 Neutral, 25-35 Fear, >35 Panic |
| **DXY (Dollar Index)** | API | Trend arrow + % |
| **Gold / GLD** | API | Giá + % (safe haven indicator) |
| **Crypto (BTC)** | API | Giá + % |
| **Fear & Greed Index** | CNN API / scrape | Gauge meter |
| **Market Status** | Logic | Pre-market / Open / Lunch / Power Hour / After Hours |

**UI:** Dark theme, grid cards, color-coded (xanh/đỏ), real-time hoặc near-real-time (15s refresh).

---

### 3.2. Stock Command Center (Trung Tâm Chỉ Huy Mã Cổ Phiếu)

**Mục đích:** Khi chọn 1 ticker → hiện toàn bộ thông tin cần thiết để ra quyết định.

#### 3.2.1. Price & Levels Panel

| Data Point | Cách tính | Hiển thị |
|------------|-----------|----------|
| **Current Price** | Real-time | Lớn, trung tâm |
| **Change % (Day)** | (Current - Prev Close) / Prev Close | Badge xanh/đỏ |
| **Pre-Market High** | PM session data | Horizontal line |
| **Pre-Market Low** | PM session data | Horizontal line |
| **Yesterday High** | Previous day data | Horizontal line |
| **Yesterday Low** | Previous day data | Horizontal line |
| **ORB High** | First 5-min candle high | Line (sau 9:35 AM ET) |
| **ORB Mid** | (ORB High + ORB Low) / 2 | Dashed line |
| **ORB Low** | First 5-min candle low | Line |
| **Fib 50%** | (Day High + Day Low) / 2 | Dotted line |
| **Fib 61.8%** | Day Low + (Day High - Day Low) × 0.618 | Dotted line |
| **Fib 38.2%** | Day Low + (Day High - Day Low) × 0.382 | Dotted line |
| **52-Week High** | Historical | Badge |
| **52-Week Low** | Historical | Badge |
| **VWAP** | Volume-weighted avg price | Moving line |
| **Key Moving Averages** | SMA 20, 50, 200 | Lines on mini chart |

**UI:** Mini price chart (TradingView embed hoặc custom canvas) với tất cả levels overlay. Bảng levels bên phải giống TradingView sidebar.

#### 3.2.2. Volume & Momentum

| Indicator | Hiển thị |
|-----------|----------|
| **Relative Volume (RVOL)** | Bar gauge: >2x = HOT, >3x = EXTREME |
| **Volume Profile** | Mini histogram |
| **RSI (14)** | Gauge: <30 Oversold, >70 Overbought |
| **MACD** | Signal crossover status |
| **True Momentum Oscillator** | Bull/Bear Div alerts |

#### 3.2.3. News & Catalysts

| Source | Implementation |
|--------|---------------|
| **Financial News** | Fetch từ Finnhub / Benzinga / Alpha Vantage News |
| **Earnings Date** | Earnings calendar API |
| **SEC Filings** | SEC EDGAR API |
| **Social Sentiment** | StockTwits API / Reddit sentiment |

**UI:** Feed dọc, mỗi news item có sentiment badge (Bullish / Bearish / Neutral), timestamp, source.

---

### 3.3. YC Quẻ Engine (Kinh Dịch AI Module) ⭐ CORE DIFFERENTIATOR

**Mục đích:** Tự động lập quẻ Mai Hoa theo thời gian, luận giải, và đưa ra bias.

#### 3.3.1. Auto Hexagram Generator

**Input:** Thời gian hiện tại (tự động) hoặc user nhập thủ công.

**Process:**
```
1. Convert Dương Lịch → Âm Lịch (API: lunar-calendar)
2. Xác định Can Chi: Năm, Tháng (theo Tiết Khí), Ngày, Giờ
3. Tính số:
   - Thượng quái = (Năm Chi số + Tháng ÂL + Ngày ÂL) ÷ 8 → dư
   - Hạ quái = (Năm Chi số + Tháng ÂL + Ngày ÂL + Giờ Chi số) ÷ 8 → dư
   - Hào động = Tổng ÷ 6 → dư
4. Map số → Quẻ (Tiên Thiên Bát Quái):
   1=Càn, 2=Đoài, 3=Ly, 4=Chấn, 5=Tốn, 6=Khảm, 7=Cấn, 8=Khôn (0→8)
5. Xác định bản quẻ + biến quẻ
6. Xác định Thể quái + Dụng quái
7. Xác định Ngũ Hành sinh khắc
8. Tính quẻ khí theo tiết khí
```

**Output:**

| Field | Hiển thị |
|-------|----------|
| **Bản Quẻ** | Tên + Ký hiệu Unicode ☰☱☲... + Ý nghĩa |
| **Biến Quẻ** | Tên + Ý nghĩa (= kết cục) |
| **Hào Động** | Vị trí (1-6) + Timing mapping |
| **Thể Quái** | Tên + Ngũ Hành + Vượng/Suy status |
| **Dụng Quái** | Tên + Ngũ Hành + Vượng/Suy status |
| **Quan hệ Thể-Dụng** | Sinh/Khắc/Tỷ hòa |

#### 3.3.2. AI Interpretation Engine

**Quy trình luận giải (BẮT BUỘC — theo thứ tự):**

```
BƯỚC 1: Đọc TƯỢNG QUẺ bản + biến
   → Xác định bias chính (Lên/Xuống/Sideway)
   → VÍ DỤ: Thăng → Hằng = "Lên và duy trì"
   → ĐÂY LÀ BIAS CUỐI CÙNG, KHÔNG ĐƯỢC LẬT

BƯỚC 2: Đọc Thể-Dụng sinh khắc
   → Xác định ai chịu áp lực
   → VÍ DỤ: Dụng khắc Thể = thị trường gây áp lực

BƯỚC 3: Kiểm tra mâu thuẫn
   → NẾU tượng quẻ nói A, Thể-Dụng nói B:
   → GHI RÕ: "Tượng quẻ nói X, Thể-Dụng nói Y"
   → ƯU TIÊN TƯỢNG QUẺ

BƯỚC 4: Hào động → Timing
   → Hào 1-2: Sáng sớm / Đầu phiên
   → Hào 3-4: Giữa phiên
   → Hào 5-6: Cuối phiên / Cuối chu kỳ

BƯỚC 5: Quẻ khí (Tiết khí)
   → Vượng/Tướng/Hưu/Tù/Tử của Thể và Dụng
```

**Output cho user:**

```
╔══════════════════════════════════╗
║  YC QUẺ BIAS: 🟢 LONG (THĂNG)  ║
║  Biến quẻ: HẰNG (Duy trì)      ║
║  Confidence: ████████░░ 80%     ║
║  Timing: Cuối phiên (Hào 5)    ║
║                                  ║
║  ⚠️ Thể-Dụng mâu thuẫn:       ║
║  "Dụng khắc Thể — thị trường   ║
║   gây áp lực, nhưng tượng quẻ  ║
║   vẫn nói LÊN"                  ║
╚══════════════════════════════════╝
```

#### 3.3.3. Thang Đo Tin Cậy (Confidence Meter)

| Điều kiện | Confidence |
|-----------|------------|
| Tượng quẻ + Thể-Dụng **cùng hướng** | 90-100% |
| Tượng quẻ rõ, Thể-Dụng **mâu thuẫn nhẹ** | 70-80% |
| Tượng quẻ rõ, Thể-Dụng **mâu thuẫn mạnh** | 50-60% |
| Tượng quẻ **mơ hồ** (Ký Tế, Vị Tế...) | 40-50% |
| Quẻ có Tuần Không / Nguyệt Phá | 20-30% → "Đứng ngoài" |

#### 3.3.4. Trading Signal Integration

Kết hợp quẻ bias + chart data → signal tổng hợp:

| Quẻ Bias | Chart Bias | Signal |
|----------|------------|--------|
| 🟢 Long | 🟢 Bullish (above VWAP, RSI rising) | **STRONG LONG** ✅✅ |
| 🟢 Long | 🔴 Bearish (below VWAP) | **QUẺẺ LONG, CHART CHƯA CONFIRM — CHỜ** |
| 🔴 Short | 🔴 Bearish | **STRONG SHORT** ✅✅ |
| 🔴 Short | 🟢 Bullish | **QUẺẺ SHORT, CHART CHƯA CONFIRM — CHỜ** |
| ⚪ Neutral | Any | **ĐỨNG NGOÀI** |

---

### 3.4. Options Strategy Panel

**Mục đích:** Khi đã có bias, suggest option play.

| Field | Logic |
|-------|-------|
| **Suggested Direction** | Từ quẻ + chart bias |
| **Strike Selection** | ATM/ITM preferred (không OTM cho 0DTE) |
| **Expiry Suggestion** | Quẻ cho bias ngày → suggest 2+ DTE. Quẻ cho bias tuần → suggest weekly/monthly |
| **Risk/Reward Calc** | Max loss = premium. Target based on Fib levels |
| **Position Size** | Max 5-10% account per trade |
| **Exit Plan** | 3-tier: T1 (1/3), T2 (1/3), T3 (1/3) + time stop |

**Cảnh báo tự động:**
- ⚠️ "0DTE + OTM = Cần timing hoàn hảo. Quẻ không cho entry chính xác co phút."
- ⚠️ "Theta decay accelerates after 2PM for 0DTE"
- ⚠️ "Quẻ bias ≠ Entry signal. Chờ chart confirm."

---

### 3.5. Watchlist & Portfolio Tracker

| Feature | Mô tả |
|---------|--------|
| **Custom Watchlist** | Add/remove tickers, drag-sort priority |
| **Heatmap View** | Grid hiển thị tất cả watchlist tickers theo % change, color-coded |
| **Portfolio P/L** | Positions tracking, unrealized/realized P&L |
| **Correlation Matrix** | Hiển thị correlation giữa các holdings |
| **Sector Breakdown** | Pie chart sectors |

---

### 3.6. News & Macro Feed

| Source | Type | Update |
|--------|------|--------|
| **Market News** | Headlines từ Finnhub/Benzinga | Real-time |
| **Economic Calendar** | Fed meetings, CPI, NFP, earnings | Daily |
| **Geopolitical Alerts** | Keyword monitoring (war, sanctions, tariff) | Real-time |
| **Sentiment Score** | Aggregate news sentiment per ticker | Hourly |

---

## 4. UX/UI Design Direction

### 4.1. Aesthetic: "War Room Meets Ancient Temple"

**Theme:** Dark mode primary. Không phải dark mode bình thường — mà là **obsidian black** với accent **gold/amber** (gợi Kinh Dịch cổ) và **neon cyan** (gợi tech/trading).

**Typography:**
- Headers: **JetBrains Mono** hoặc **Space Mono** (monospace cho số liệu)
- Body: **DM Sans** hoặc **Outfit**
- Quẻ display: **Custom Unicode / SVG trigrams**

**Color Palette:**
```css
:root {
  --bg-primary: #0a0a0f;        /* Deep obsidian */
  --bg-card: #12121a;           /* Card background */
  --bg-elevated: #1a1a28;       /* Elevated surfaces */
  --accent-gold: #d4a847;       /* I Ching gold — quẻ, headers */
  --accent-cyan: #00e5ff;       /* Tech cyan — prices, data */
  --bull: #00e676;              /* Green — bullish */
  --bear: #ff1744;              /* Red — bearish */
  --neutral: #78909c;           /* Grey — neutral */
  --text-primary: #e8e8f0;      /* Main text */
  --text-secondary: #8888a0;    /* Secondary text */
  --border: #2a2a3a;            /* Borders */
  --glow-gold: 0 0 20px rgba(212, 168, 71, 0.3);  /* Gold glow */
  --glow-cyan: 0 0 20px rgba(0, 229, 255, 0.3);   /* Cyan glow */
}
```

**Visual Elements:**
- Trigram symbols (☰☱☲☳☴☵☶☷) animated khi lập quẻ
- Subtle hexagram pattern overlay trên background
- Glowing borders cho active/important cards
- Particle effect nhẹ khi quẻ được lập (ancient mystical feel)

### 4.2. Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR: Market Status | Time (DL + ÂL + Can Chi) | Search │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│ SIDEBAR  │     MAIN CONTENT AREA            │   RIGHT       │
│          │                                  │   PANEL       │
│ - Market │  [Stock Command Center]          │               │
│   Pulse  │  - Mini Chart + Levels           │ - Quẻ Engine  │
│          │  - Volume & Momentum             │ - AI Bias     │
│ - Watch  │                                  │ - Confidence  │
│   list   │  [News Feed]                     │ - Timing      │
│          │                                  │ - Option      │
│ - Port   │  [Options Panel]                 │   Strategy    │
│   folio  │                                  │               │
│          │                                  │               │
├──────────┴──────────────────────────────────┴───────────────┤
│  BOTTOM BAR: Alerts | P/L Summary | Quick Actions           │
└─────────────────────────────────────────────────────────────┘
```

### 4.3. Mobile Responsive

- Sidebar → Bottom tab navigation
- Right panel → Swipe-up sheet
- Cards stack vertically
- Quẻ bias = sticky banner on top

---

## 5. Technical Architecture

### 5.1. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | React + TypeScript | Component-based, type-safe |
| **Styling** | Tailwind CSS + Custom CSS | Rapid dev + custom aesthetics |
| **Charts** | TradingView Lightweight Charts / Recharts | Professional chart rendering |
| **State** | Zustand | Simple, fast state management |
| **Data Fetching** | TanStack Query | Caching, refetching, real-time |
| **Backend** | Next.js API Routes / FastAPI (Python) | SSR + API endpoints |
| **AI Engine** | Anthropic Claude API (Sonnet) | Quẻ interpretation + analysis |
| **Lunar Calendar** | `lunar-javascript` npm / Custom algo | Can Chi conversion |
| **Database** | Supabase (PostgreSQL) | User data, watchlists, history |
| **Auth** | Supabase Auth / Clerk | User authentication |
| **Deployment** | Vercel | Fast, free tier available |

### 5.2. Data APIs

| API | Purpose | Cost |
|-----|---------|------|
| **Yahoo Finance (yfinance)** | Price, historical data | Free |
| **Alpha Vantage** | Intraday, fundamentals | Free tier (5/min) |
| **Polygon.io** | Real-time quotes, options | $29/mo Starter |
| **Finnhub** | News, sentiment, earnings | Free tier |
| **Unusual Whales** | Options flow | $47/mo |
| **TradingView Widget** | Embedded charts | Free (with branding) |
| **Anthropic API** | Claude for quẻ interpretation | Pay-per-use |

### 5.3. Quẻ Engine — Technical Implementation

```python
# Core hexagram calculation
class MaiHoaEngine:
    TIEN_THIEN = {
        1: "Càn", 2: "Đoài", 3: "Ly", 4: "Chấn",
        5: "Tốn", 6: "Khảm", 7: "Cấn", 8: "Khôn"  # 0 remainder → 8
    }

    NGU_HANH = {
        "Càn": "Kim", "Đoài": "Kim",
        "Ly": "Hỏa",
        "Chấn": "Mộc", "Tốn": "Mộc",
        "Khảm": "Thủy",
        "Cấn": "Thổ", "Khôn": "Thổ"
    }

    DIA_CHI_SO = {
        "Tý": 1, "Sửu": 2, "Dần": 3, "Mão": 4,
        "Thìn": 5, "Tỵ": 6, "Ngọ": 7, "Mùi": 8,
        "Thân": 9, "Dậu": 10, "Tuất": 11, "Hợi": 12
    }

    def calculate(self, lunar_year_chi, lunar_month, lunar_day, hour_chi):
        year_num = self.DIA_CHI_SO[lunar_year_chi]
        hour_num = self.DIA_CHI_SO[hour_chi]

        upper_sum = year_num + lunar_month + lunar_day
        lower_sum = upper_sum + hour_num

        upper_gua = upper_sum % 8 or 8
        lower_gua = lower_sum % 8 or 8
        yao_dong = lower_sum % 6 or 6

        return {
            "upper": self.TIEN_THIEN[upper_gua],
            "lower": self.TIEN_THIEN[lower_gua],
            "moving_line": yao_dong,
            "hexagram_name": self.get_hexagram_name(upper_gua, lower_gua),
            "changed_hexagram": self.get_changed(upper_gua, lower_gua, yao_dong)
        }
```

### 5.4. AI Interpretation Pipeline

```
User opens dashboard at time T
        │
        ▼
┌─────────────────┐
│  Convert to      │
│  Lunar Calendar  │ ← lunar-javascript / API
│  + Can Chi       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mai Hoa Engine  │ → Bản quẻ + Biến quẻ + Hào động
│  (Deterministic) │ → Thể/Dụng + Ngũ Hành
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Claude API      │ ← System prompt with:
│  (Interpretation)│   - Quẻ data (structured)
│                  │   - Current price data
│                  │   - News headlines
│                  │   - User's ticker
│                  │
│  RULES:          │
│  1. Tượng quẻ #1 │
│  2. Thể-Dụng #2  │
│  3. Flag mâu thuẫn│
│  4. Output bias   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard UI    │ → Bias card + Confidence + Timing
│  Display         │ → Merged with TA signals
└─────────────────┘
```

---

## 6. Unique Features (Competitive Moat)

### 6.1. "Morning Hexagram" — Quẻ Buổi Sáng

Mỗi sáng trước market open, dashboard tự động:
1. Lập quẻ Mai Hoa theo giờ mở cửa (9:30 AM ET)
2. Luận bias cho từng ticker trong watchlist
3. Push notification: "QQQ Morning Bias: 🟢 LONG (Thăng → Hằng) | Confidence: 80%"

### 6.2. "Hexagram Backtest"

Cho phép user xem lại quẻ quá khứ và so sánh với price action thật:
- Input: Ticker + Date
- Output: Quẻ lúc đó + Actual price movement + Accuracy score
- Aggregate: "YC Engine accuracy last 30 days: 68%"

### 6.3. "Quẻ + Chart Divergence Alert"

Khi quẻ nói Long nhưng chart bearish (hoặc ngược lại) → alert:
> ⚠️ "DIVERGENCE: Quẻ says LONG but price below VWAP. Rule: TIN QUẺ nhưng CHỜ chart confirm."

### 6.4. "Session Timer with Hào Mapping"

Hiển thị session clock với hào tương ứng:
```
09:30 ─── 10:30 ─── 11:30 ─── 12:30 ─── 14:00 ─── 15:30 ─── 16:00
 Hào 1-2     Hào 3       Hào 3-4     Lunch     Hào 5      Hào 6    Close
 [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
                                              ▲ YOU ARE HERE
                                        "Hào 5 — Biến động chính"
```

### 6.5. "Option Advisor" with Quẻ Timing

Dựa trên hào động + bias, suggest:
- Hào 1-2 → "Action sáng sớm. 0DTE OK nếu ATM."
- Hào 3-4 → "Giữa phiên. Suggest 1-2 DTE."
- Hào 5-6 → "Cuối phiên / cuối tuần. Suggest weekly expiry."

---

## 7. Monetization

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Market Pulse, 1 ticker, basic quẻ (1/day) |
| **Pro** | $19/mo | Unlimited tickers, full quẻ engine, options panel, alerts |
| **Elite** | $49/mo | Backtest, API access, priority AI interpretation, custom strategies |

---

## 8. Development Roadmap

### Phase 1 — MVP (4-6 weeks)
- [ ] Market Pulse dashboard
- [ ] Stock Command Center (1 ticker)
- [ ] Levels panel (PM H/L, Yesterday H/L, Fib, ORB)
- [ ] Mai Hoa Engine (auto calculate)
- [ ] Basic AI interpretation (Claude API)
- [ ] Bias output card

### Phase 2 — Core Features (4-6 weeks)
- [ ] Watchlist + Heatmap
- [ ] News feed integration
- [ ] Options Strategy Panel
- [ ] Session Timer with Hào mapping
- [ ] Mobile responsive

### Phase 3 — Advanced (4-6 weeks)
- [ ] Hexagram Backtest
- [ ] Quẻ + Chart Divergence Alert
- [ ] Portfolio tracker
- [ ] Push notifications
- [ ] User accounts + saved settings

### Phase 4 — Scale (Ongoing)
- [ ] TradingView plugin/overlay
- [ ] Pine Script integration
- [ ] Community features (share quẻ readings)
- [ ] Multi-language (EN/VI)
- [ ] AI learning from historical quẻ accuracy

---

## 9. Key Principles (Baked Into Product DNA)

> **1. TƯỢNG QUẺ LÀ VUA**
> Bản quẻ + Biến quẻ quyết định bias. Thể-Dụng là bổ trợ. Dashboard KHÔNG BAO GIỜ override tượng quẻ bằng TA signals.

> **2. QUẺẺ LÀ ĐIỂM SÁNG, CHART LÀ ĐIỂM MÙ**
> Khi quẻ và chart mâu thuẫn → hiển thị cả hai nhưng ghi rõ: "Ưu tiên quẻ, chờ chart confirm."

> **3. KHÔNG GHÉP BIAS CÁ NHÂN**
> AI interpretation phải trung thực. Không được "muốn short" rồi xoay quẻ thành bearish.

> **4. QUẺ CHO BIAS, KHÔNG CHO ENTRY**
> Quẻ cho hướng ngày/tuần. Entry/exit phải dùng chart (levels, ORB, VWAP). Dashboard phải tách rõ: "QUẺẺ BIAS" vs "CHART ENTRY."

> **5. 0DTE CẦN THÊM XÁC NHẬN**
> Khi user chọn 0DTE → cảnh báo: "Quẻ cho bias ngày. 0DTE cần timing chính xác. Suggest ATM/ITM + chart confirm trước khi vào."

---

## 10. Competitive Landscape

| Product | What They Do | YC Advantage |
|---------|-------------|--------------|
| TradingView | Charts + TA | Không có quẻ, không có AI bias |
| Bloomberg Terminal | Everything finance | $24k/year, không có Kinh Dịch |
| Unusual Whales | Options flow | Không có quẻ integration |
| ChatGPT + Trading | General AI chat | Không có structured quẻ engine, không real-time |
| **YC Dashboard** | **TA + Kinh Dịch + AI = One screen** | **Unique combination chưa ai làm** |

---

*Document Version: 1.0*
*Author: YC Strategic Team*
*Last Updated: April 2, 2026*
*"Where Ancient Wisdom Meets Modern Markets"*
