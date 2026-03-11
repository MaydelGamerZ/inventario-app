import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import InventarioDiario from './pages/InventarioDiario';
import Historial from './pages/Historial';
import Productos from './pages/Productos';
import Juego from './pages/Juego';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inventario" element={<InventarioDiario />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/juego" element={<Juego />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
