# NavStab: Naval Architecture Hydrostatics & Stability Calculator
## Comprehensive Project Report

### 1. Introduction
NavStab is a specialized calculation engine and web-based dashboard designed for naval architecture. Its primary purpose is to compute the hydrostatic parameters and stability curves of vessels based on their principal dimensions. By providing instant numerical and visual feedback, NavStab allows designers to quickly iterate on hull concepts.

### 2. System Architecture & Technologies
The project is built as a modern, reactive web application. It utilizes a robust technology stack to ensure performance and maintainability:
* **Core Framework**: Vite for fast bundling and development.
* **Logic Layer**: JavaScript (ESM) to handle the complex mathematical models and physics calculations.
* **State Management**: Zustand for lightweight, reactive state management across UI components.
* **Visualization**: 
  * **Three.js**: For rendering 3D wireframe representations of the generated hull.
  * **Plotly.js**: For drawing interactive stability charts (GZ and KN curves).
* **Exporting & Reporting**: jsPDF for document generation and SheetJS (xlsx) for spreadsheet exporting.

### 3. Core Engine Modules (`src/engine/`)
The engine layer operates completely independent of the UI, ensuring that the physics calculations remain pure and testable.
* **`hullGenerator.js`**: Takes the principal dimensions of a ship (Length, Breadth, Draft, Depth) along with form coefficients (Block, Midship, Waterplane) to generate a representative 3D offset table. It creates waterlines and stations using mathematical approximations.
* **`hydrostatics.js`**: Applies numerical integration over the generated offset table. It calculates critical hydrostatic parameters required for naval design:
  * **Displacement (Δ) & Volume (∇)**: The total weight and volume of the displaced water.
  * **LCB & LCF**: Longitudinal Centers of Buoyancy and Flotation, critical for trim.
  * **KB & KM**: Vertical Centers of Buoyancy and Metacenter, the foundation of initial stability.
  * **TPC & MCTC**: Tons per cm immersion & Moment to change trim, used for loading calculations.
* **`stability.js`**: Calculates the Righting Lever (GZ) and Cross Curves of Stability (KN) at various heel angles (from 0° to 60°). It is responsible for checking these values against international maritime regulations.

### 4. Mathematical Methodology
NavStab relies on established numerical methods in naval architecture:
* **Simpson's Rules**: Used extensively in `hydrostatics.js` to integrate areas under curves (e.g., calculating waterplane areas and submerged volumes from the offset table).
* **Wall-Sided Formula**: Employed for calculating stability at small to moderate angles of heel.

### 5. IMO Stability Criteria Assessment
A critical feature of NavStab is its ability to automatically verify a design against the **IMO (International Maritime Organization) Stability Criteria** (Resolution A.749). The software checks:
1. **Initial GM**: Must be ≥ 0.15 m.
2. **Maximum GZ**: Must be ≥ 0.20 m at an angle ≥ 30°.
3. **Area under GZ Curve (0°-30°)**: Must be ≥ 0.055 m·rad.
4. **Area under GZ Curve (30°-40°)**: Must be ≥ 0.030 m·rad.
The system flags the design as PASS/FAIL based on these stringent requirements.

### 6. User Interface & Visualization (`src/ui/`)
* **`dashboard.js`**: The main entry point for the user interface, coordinating state and layout.
* **`shipParams.js`**: A dynamic form component allowing users to input their vessel's dimensions.
* **`hydroCurves.js`**: Renders the GZ and KN stability curves interactively, allowing users to hover over data points for exact values.
* **`hullViewer.js`**: Renders a 3D wireframe mesh of the hull, giving users immediate visual feedback on the ship's shape as they adjust parameters.

### 7. Reporting and Exporting
The software includes automated reporting capabilities, crucial for professional engineering environments:
* **PDF Generation**: The software exports formal hydrostatic reports, complete with embedded GZ/KN charts, making it easy to share results.
* **Data Export**: Tabular data, including full calculation arrays, can be exported to Excel (.xlsx) or CSV formats for further analysis in external tools.
* **Code Bundling**: The system includes a utility to bundle all source code into a single reference document or PDF appendix.

### 8. Installation and Execution
NavStab is designed to be highly accessible:
* **Development Server**: Can be run locally using `npm run dev` to access the interactive web UI.
* **Command Line Interface**: Calculations can be run headlessly using Node.js (e.g., `node example-usage.js`) to generate outputs without starting the web server.

### 9. Conclusion
NavStab provides a robust, interactive, and mathematically sound foundation for preliminary ship design. By coupling real-time physics calculations with a responsive 3D web interface, it allows naval architects and students to rapidly iterate on hull designs, instantly visualize the physical implications of parameter changes, and verify IMO stability compliance.
