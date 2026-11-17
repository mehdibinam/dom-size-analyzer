# 🧩 DOM Size Analyzer
**DOM Size Analyzer** is a lightweight browser extension (or DevTools panel) that helps web developers inspect and optimize the size and structure of the DOM tree on any webpage.

## 🚀 Why You Might Need It
Large DOM trees with deeply nested or excessive elements can severely impact rendering performance, layout calculations, and interactivity.
While tools like **Lighthouse** warn about excessive DOM size, they don’t tell you *where* the problem is.
**DOM Size Analyzer** fills that gap — giving you a clear, visual overview of which parts of your page contribute most to DOM complexity.

## ✨ Features
* 🔍 Displays the **number of descendant elements** for any DOM node when hovered
* 🌲 Shows the **nesting depth** of each element
* 💡 Highlights elements directly on the page as you inspect them
* 📊 Provides a detailed breakdown of DOM-heavy areas
* 🧠 Simple and intuitive UI inside DevTools
* ⚡ Helps you identify and fix performance bottlenecks caused by overly complex DOM structures

## 🧠 How It Works
1. **Install** the extension in your browser.
2. Open any webpage, right-click and choose **Inspect** to open DevTools.
3. A new panel named **DOM Size Analyzer** will appear.
4. Click the **Analyze** button to start scanning the page.
5. The tool will list elements along with:
   * Total number of descendants
   * Depth of nesting
6. Hover over a row to highlight the corresponding element in the live page.
7. Identify heavy sections and refactor the related HTML or components.

## ✅ Benefits
* Identify and visualize DOM complexity in real time
* Go beyond Lighthouse’s general warnings — find *where* the problem actually is
* Improve rendering performance and user experience
* Ideal for frontend developers, performance engineers, and SEO optimizers

## ⚙️ Notes & Limitations
* The tool provides insights but doesn’t modify your page automatically.
* On very large pages, the initial analysis may take a few seconds.
* Currently optimized for Chromium-based browsers (Chrome, Edge, Brave).

## 💻 Open Source
This project is open source and available under the MIT License.
Contributions, pull requests, and feature suggestions are always welcome!
🔗 [GitHub Repository](https://github.com/mehdibinam/dom-size-analyzer)

________________________
## معرفی افزونه «DOM Size Analyzer»
افزونه **DOM Size Analyzer** یک افزونه برای مرورگر (یا ابزار DevTools) است که به توسعه‌دهندگان وب کمک می‌کند تا اندازه و ساختار درخت DOM صفحات وب را تحلیل و بهینه کنند.

### چرا به این افزونه نیاز دارید؟
* صفحات بزرگ با تعداد زیاد عناصر DOM ممکن است منجر به عملکرد ضعیف در رندرینگ، محاسبه استایل‌ها و پاسخ‌دهی به تعاملات کاربر شوند. ([web.dev][1])
* ابزارهایی مانند Lighthouse هشدار می‌دهند که اگر تعداد عناصر DOM بسیار زیاد شود، عملکرد صفحه ممکن است کاهش یابد. ([Chrome for Developers][2])
* اما گزارش Lighthouse معمولاً کلی است و نشان نمی‌دهد کدام قسمت از صفحه بیشترین سهم را در حجم DOM دارد. افزونه «DOM Size Analyzer» این شکاف را پر می‌کند و نواحی پر-هزینه را به شما نشان می‌دهد. ([medium.com][3])

### قابلیت‌ها و ویژگی‌ها
* نمایش تعداد عناصر زیر شاخه (descendant elements) برای هر عنصر هنگام حرکت موس روی آن
* عمق درخت (nesting depth) هر عنصر را نشان می‌دهد
* هنگام کلیک یا انتخاب یک عنصر، آن بخش از صفحه را برجسته (Highlight) می‌کند تا بدانید کدام قسمت از صفحه مربوط به آن عنصر است
* امکان بررسی دقیق قسمت‌هایی از DOM که بیشترین بار را دارند
* رابط کاربری ساده و امکان اجرا از طریق DevTools (بخش Inspect) ([webtrainingwheels.com][4])

### چطور از آن استفاده کنیم
1. افزونه را به مرورگر خود اضافه کنید.
2. در صفحه‌ای که می‌خواهید آن را تحلیل کنید، روی صفحه راست کلیک کرده و گزینه **Inspect** را انتخاب کنید.
3. در پنل DevTools، تب جدیدی با عنوان مانند **Analyze DOM Size** ظاهر خواهد شد.
4. روی دکمه پخش (Play) کلیک کنید تا افزونه شروع به تحلیل کند.
5. پس از تحلیل، فهرستی از عناصر DOM نمایش داده می‌شود؛ هر عنصر شامل تعداد کل عناصر فرزند و عمق درخت است.
6. با حرکت موس روی هر ردیف، عنصر متناظر در صفحه برجسته می‌شود تا محل دقیق آن را ببینید.
7. پس از شناسایی بخش‌های پرحجم یا پیچیده، می‌توانید به بازنویسی یا بهینه‌سازی کد آن بخش بپردازید.

### فواید و مزایا
* کمک به شناسایی قسمت‌های مشکل‌ساز در DOM که باعث کندی عملکرد می‌شوند
* تبدیل یک معیار کلی (تعداد کل عناصر) به شناسه‌های دقیق‌تر
* قابلیت بهبود عملکرد صفحات با تمرکز بر اصلاح بخش‌هایی که بیشترین تأثیر را دارند
* مناسب برای توسعه‌دهندگان فرانت‌اند، بهینه‌سازی عملکرد و سئو

### محدودیت‌ها / نکات قابل توجه
* این ابزار تحلیلی است و اصلاح خودکار انجام نمی‌دهد — شما باید بر اساس نتایج، تغییرات را به کدتان اعمال کنید.
* در صفحات بسیار پیچیده با تعداد عناصر بسیار زیاد، تحلیل ممکن است زمان‌بر باشد.
* افزونه ممکن است در برخی مرورگرها یا نسخه‌های خاص با محدودیت‌هایی مواجه شود (به‌خاطر مجوزها یا قابلیت‌های DevTools)
<img width="1919" height="900" alt="full-dom-size-analyzer" src="https://github.com/user-attachments/assets/62c4a9d6-cd17-46f4-944b-3f76ccd9cf7b" />
<img width="395" height="708" alt="control dom size" src="https://github.com/user-attachments/assets/37b394bd-9932-484f-92fc-7a9e2a78a5e5" />


Create an issue in the GitHub repository
Built with ❤️ for cafe owners and managers
