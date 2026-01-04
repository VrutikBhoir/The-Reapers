# Transformation Tool - AI-Powered Data Preparation Platform

The **Transformation Tool** is a sophisticated, modern web application designed to streamline the critical process of preparing raw data for Machine Learning models. Built with **React 19**, **TypeScript**, and **Vite**, it leverages the power of **Google's Gemini AI** to intelligently analyze, validate, clean, and transform messy datasets into high-quality, ML-ready formats.

This tool bridges the gap between raw data ingestion and model training by automating the tedious tasks of data cleaning and schema mapping, providing users with actionable insights and transparent quality metrics.

---

## 🚀 Key Features

### 1. Universal Data Ingestion
- **Multi-Format Support**: Seamlessly upload and process CSV, Excel (`.xlsx`, `.xls`), and JSON files.
- **Auto-Parsing**: robust parsing engines (`papaparse`, `xlsx`) handle large files and various encodings.
- **Initial Analysis**: Immediate feedback on file structure, row counts, and column headers.

### 2. Intelligent Semantic Inference
- **Type Detection**: Automatically identifies data types (Numeric, Date, String, Boolean).
- **Semantic Understanding**: Goes beyond basic types to understand context (e.g., distinguishing "Age" from generic numbers, or "Email" from strings).
- **Gemini AI Integration**: Uses LLMs to infer column intent and suggest appropriate validation rules.

### 3. Advanced Validation & Quality Checks
- **Comprehensive Rules**: Checks for:
  - **Type Mismatches**: (e.g., text in a numeric column).
  - **Range Constraints**: (e.g., negative ages, outlier prices).
  - **Format Consistency**: (e.g., date formats, email patterns).
  - **Required Fields**: Identifies missing critical data.
- **Quality Scoring**: Calculates an overall "Quality Score" for the dataset to track improvement.

### 4. Automated Data Cleaning
- **Standardization**: Normalizes formats for dates, currency, and text cases.
- **Error Handling**: Automatically fixes common issues (e.g., nullifying invalid negative numbers, stripping whitespace).
- **Imputation**: Strategies to handle missing values based on column type.

### 5. AI-Driven Insights (Gemini)
- **Natural Language Summaries**: Generates human-readable reports on what was wrong with the data and how it was fixed.
- **Risk Assessment**: Highlights potential risks in the dataset that might affect ML model performance.
- **Transformation Audit**: Explains *why* specific changes were made.

### 6. Interactive Visualizations & Reporting
- **Dashboard**: A central command center orchestrating the entire pipeline.
- **ML Impact Analysis**: Side-by-side "Before vs. After" comparison of data.
- **Visual Metrics**: Charts and graphs (powered by `Recharts`) showing quality improvements and error distributions.

---

## 🛠️ Technology Stack

### Frontend Core
- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)

### Styling & UI
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Utility-first CSS framework)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: Custom accessible components structured for reusability.

### Data Processing & AI
- **AI Model**: [Google Gemini Flash Lite](https://ai.google.dev/) (via `@google/generative-ai`)
- **CSV Parsing**: `papaparse`
- **Excel Processing**: `xlsx`
- **Data Logic**: Custom TypeScript libraries for schema mapping and validation.

### Visualization
- **Charts**: `recharts` for dynamic data visualization.

---

## 📂 Project Structure

```
transformation-tool/
├── src/
│   ├── assets/            # Static assets (images, svg)
│   ├── components/        # React Components
│   │   ├── layout/        # Layout wrappers (Header, Sidebar)
│   │   ├── Dashboard.tsx  # Main orchestration component
│   │   ├── FileUpload.tsx # Drag-and-drop file uploader
│   │   ├── ...            # Other UI widgets (CleaningReport, MLImpact, etc.)
│   ├── lib/               # Core Logic & Utility Libraries
│   │   ├── cleaner.ts     # Data cleaning algorithms
│   │   ├── gemini.ts      # Google Gemini API integration
│   │   ├── validator.ts   # Data validation logic
│   │   ├── schema-mapper.ts # Column mapping logic
│   │   └── ...
│   ├── types/             # TypeScript interfaces and type definitions
│   ├── App.tsx            # Root Application component
│   └── main.tsx           # Entry point
├── public/                # Public static files
├── .env                   # Environment variables configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

---

## ⚡ Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- **Node.js**: Version 18 or higher.
- **npm** or **yarn**: Package manager.
- **Google Gemini API Key**: Required for AI features. [Get one here](https://aistudio.google.com/app/apikey).

### Installation

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd transformation-tool
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory (copy from `.env.example` if available):
    ```env
    VITE_GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    The application will launch at `http://localhost:5173`.

---

## 📖 Usage Guide

1.  **Upload Data**: Drag and drop your CSV, Excel, or JSON file onto the upload zone.
2.  **Analyze**: The tool will parse the file and display initial metadata (columns, rows, size).
3.  **Process**: Click "Start Processing" to trigger the pipeline:
    -   *Inference*: Detects column types.
    -   *Validation*: Checks data against inferred rules.
    -   *Cleaning*: Applies fixes to invalid data.
    -   *AI Analysis*: Generates insights.
4.  **Review**:
    -   Check the **Cleaning Report** to see what was fixed.
    -   View **Validation Issues** for any remaining warnings.
    -   Read **AI Insights** for a summary.
    -   Explore **ML Impact** to compare raw vs. cleaned data.
5.  **Export**: (Future feature) Download the cleaned dataset.

---

## 🧩 Key Components Explained

### `Dashboard.tsx`
The central hub that manages the application state. It orchestrates the flow of data from upload to cleaning and renders the appropriate sub-components based on the current processing stage.

### `lib/gemini.ts`
Handles all interactions with the Google Gemini API. It includes functions to:
-   `inferSemanticValidationRules`: Ask Gemini to guess what the data represents.
-   `generateDataQualityReport`: Ask Gemini to summarize the data quality.

### `lib/cleaner.ts`
Contains the deterministic logic for cleaning data. It iterates through rows and applies transformations based on the column's expected type (e.g., parsing dates, coercing numbers).

### `lib/validator.ts`
Runs the validation rules against the dataset. It produces a list of errors and warnings for each row and column.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
