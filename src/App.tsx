import { useState, useEffect } from 'react';
import logo from '/Logo.png';
import logoWhite from '/Logo-white.png';
import './App.css';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';

function App() {
  const [distance, setDistance] = useState('');
  const [consumption, setConsumption] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const km = parseFloat(distance);
    const consumo = parseFloat(consumption);
    const preco = parseFloat(fuelPrice);

    const isInvalid =
      isNaN(km) || isNaN(consumo) || isNaN(preco) || consumo <= 0;

    setIsButtonDisabled(isInvalid);
  }, [distance, consumption, fuelPrice]);

  const calculate = () => {
    const km = parseFloat(distance);
    const consumo = parseFloat(consumption);
    const preco = parseFloat(fuelPrice);

    const litrosNecessarios = km / consumo;
    const custoTotal = litrosNecessarios * preco;

    setCost(custoTotal);
  }


  return (
    <div className={`container${darkMode ? 'dark' : ''}`}> 
      <div className="header-bar">
        <a style={{ display: 'flex', alignItems: 'center' }}>
          <img src={darkMode ? logoWhite : logo} className="logo header-logo" alt="Logo Viaje Bem" />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
          <Switch
            checked={darkMode}
            onChange={() => setDarkMode((prev) => !prev)}
            color="default"
          />
          <span style={{ color: darkMode ? '#fff' : '#111b21', fontWeight: 500 }}>
            {darkMode ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        </div>
      </div>

      <div className="box">
        <h1 className='description'>Inclua as informações para gerar o cálculo</h1>
        <TextField
          label="KM (ida e volta)"
          variant="outlined"
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Consumo por litro do automóvel"
          variant="outlined"
          type="number"
          value={consumption}
          onChange={(e) => setConsumption(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Preço médio do combustível"
          variant="outlined"
          type="number"
          value={fuelPrice}
          onChange={(e) => setFuelPrice(e.target.value)}
          fullWidth
          margin="normal"
        />

        <Button variant='outlined' size="large" onClick={calculate} disabled={isButtonDisabled}>
          Calcular
        </Button>

        <div className='boxResponse'>
          <p className='paragraph'>custo de combustível para a viagem:</p>
          <p className='response'>{cost !== null ? `R$ ${cost.toFixed(2).replace('.', ',')}` : '—'}</p>
        </div>
      </div>
    </div>
  )
}

export default App
