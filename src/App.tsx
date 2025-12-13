import { useState, useEffect } from 'react';
import './App.css';
import { InputNumber } from 'primereact/inputnumber';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { RadioButton } from "primereact/radiobutton";
import type { RadioButtonChangeEvent } from "primereact/radiobutton";
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primeicons/primeicons.css';

function App() {
  const [distance, setDistance] = useState<number | null>(null);
  const [consumption, setConsumption] = useState<number | null>(null);
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);
  const [toll, setToll] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [isAdvancedButtonDisabled, setIsAdvancedButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedPassagers, setSelectedPassagers] = useState<any>(null);
  const [selectedCondution, setSelectedCondution] = useState<any>(null);
  const [air, setAir] = useState('');
  const [advancedCost, setAdvancedCost] = useState<any>(null);
  const [showBasicResult, setShowBasicResult] = useState(false);
  const [showAdvancedResult, setShowAdvancedResult] = useState(false);

  const passagers = [
    { label: '1–2 pessoas', adjustment: 0, maxPeople: 2 },
    { label: '3–4 pessoas', adjustment: 5, maxPeople: 4 },
    { label: '5 pessoas / carga pesada', adjustment: 10, maxPeople: 5 },
  ];

  const condution = [
    { label: 'Acelera com calma, antecipa trocas', name: 'Eco', adjustment: -8 },
    { label: 'Condução do dia a dia', name: 'Normal', adjustment: 0 },
    { label: 'Acelera forte e mantém giro alto', name: 'Agressivo', adjustment: 15 }
  ];


  // Fórmula base:
  //   Litros necessários = Distância (km) ÷ Consumo (km/L)
  // Custo combustível = Litros × Preço por litro

  useEffect(() => {
    const km = distance ?? NaN;
    const consumo = consumption ?? NaN;
    const preco = fuelPrice ?? NaN;

    const isInvalid =
      isNaN(km) || isNaN(consumo) || isNaN(preco) || consumo <= 0;

    setIsButtonDisabled(isInvalid);
  }, [distance, consumption, fuelPrice]);

  useEffect(() => {
    const km = distance ?? NaN;
    const consumo = consumption ?? NaN;
    const preco = fuelPrice ?? NaN;

    const isInvalid =
      isNaN(km) || isNaN(consumo) || isNaN(preco) || consumo <= 0 ||
      !selectedPassagers || !selectedCondution || !air;

    setIsAdvancedButtonDisabled(isInvalid);
  }, [distance, consumption, fuelPrice, selectedPassagers, selectedCondution, air]);

  const calculate = () => {
    setLoading(true);
    const km = distance ?? 0;
    const consumo = consumption ?? 0;
    const preco = fuelPrice ?? 0;

    const litrosNecessarios = km / consumo;
    const custoTotal = litrosNecessarios * preco;

    setCost(custoTotal);
    setShowBasicResult(true);
    setLoading(false);
  }

  const resetBasic = () => {
    setDistance(null);
    setConsumption(null);
    setFuelPrice(null);
    setCost(null);
    setShowBasicResult(false);
  }

  const calculateAdvanced = () => {
    setLoading(true);

    const km = distance ?? 0;
    const consumoBase = consumption ?? 0;
    const preco = fuelPrice ?? 0;
    const pedagio = toll ?? 0;

    // 1. Calcular ajuste total
    let ajusteTotal = 0;

    // Perfil de condução
    ajusteTotal += selectedCondution?.adjustment ?? 0;

    // Passageiros/carga
    ajusteTotal += selectedPassagers?.adjustment ?? 0;

    // Ar-condicionado
    if (air === 'Yes') {
      ajusteTotal += 5;
    }

    // 2. Calcular fator total
    const fatorTotal = 1 + (ajusteTotal / 100);

    // 3. Ajustar consumo (mais consumo = menos km/L)
    const consumoAjustado = consumoBase / fatorTotal;

    // 4. Calcular litros necessários
    const litros = km / consumoAjustado;

    // 5. Calcular custo de combustível
    const custoCombustivel = litros * preco;

    // 6. Somar pedágios
    const custoTotal = custoCombustivel + pedagio;

    // 7. Calcular faixa estimada (±5%)
    const custoMin = custoTotal * 0.95;
    const custoMax = custoTotal * 1.05;

    // 8. Montar detalhes dos impactos
    const impactos = [];
    if (selectedCondution && selectedCondution.adjustment !== 0) {
      impactos.push(`Perfil de condução ${selectedCondution.name} (${selectedCondution.adjustment > 0 ? '+' : ''}${selectedCondution.adjustment}%)`);
    }
    if (air === 'Yes') {
      impactos.push('Ar-condicionado (+5%)');
    }
    if (selectedPassagers && selectedPassagers.adjustment !== 0) {
      impactos.push(`Passageiros/carga (+${selectedPassagers.adjustment}%)`);
    }

    setAdvancedCost({
      total: custoTotal,
      min: custoMin,
      max: custoMax,
      impactos,
      litros,
      consumoAjustado,
      ajusteTotal
    });

    setShowAdvancedResult(true);
    setLoading(false);
  }

  const resetAdvanced = () => {
    setDistance(null);
    setConsumption(null);
    setFuelPrice(null);
    setToll(null);
    setSelectedPassagers(null);
    setSelectedCondution(null);
    setAir('');
    setAdvancedCost(null);
    setShowAdvancedResult(false);
  }


  return (
    <div className="container-group">
      <div className="giphy">
        <img src="/gif.gif" alt="Gatinho dirigindo na cidade" className='gif' />
      </div>

      <div className='content'>
        <div className='header'>
          <img src="/cat-driving.svg" alt="logo" className='logo' />
          <p className='description'>calculamos o custo da viagem do seu jeito: carro, trajeto e como você dirige.</p>
        </div>

        <TabView>
          <TabPanel header="Cálculo Básico">
            {!showBasicResult ? (
              <div className='fields'>
                <InputNumber
                  value={distance}
                  onValueChange={(e) => setDistance(e.value ?? null)}
                  placeholder="Digite a distância (ida e volta)"
                  suffix="km"
                />

                <InputNumber
                  value={consumption}
                  onValueChange={(e) => setConsumption(e.value ?? null)}
                  placeholder="Consumo por litro do automóvel"
                  locale="pt-BR"
                  suffix='km/L'
                />

                <InputNumber
                  value={fuelPrice}
                  onValueChange={(e) => setFuelPrice(e.value ?? null)}
                  placeholder="Preço do litro do combustível"
                  mode="currency" currency="BRL" locale="pt-BR"
                />

                <div className='footer'>
                  <Button label="Calcular" loading={loading} onClick={calculate} disabled={isButtonDisabled} />
                </div>
              </div>
            ) : (
              <div className='response-container'>
                <div className='header-result'>
                  <h3>Custo estimado da viagem:</h3>
                  <Button label="Novo cálculo" icon="pi pi-refresh" onClick={resetBasic} />
                </div>

                <div className='response-result'>
                  <p className='response-range'>{cost !== null ? `R$ ${cost.toFixed(2).replace('.', ',')}` : ''}</p>
                </div>

                <Divider />

                {cost !== null && (
                  <div className='division'>
                    <h4>Divisão do valor:</h4>
                    <p>Dividido por 2 pessoas: R$ {(cost / 2).toFixed(2).replace('.', ',')} por pessoa</p>
                    <p>Dividido por 3 pessoas: R$ {(cost / 3).toFixed(2).replace('.', ',')} por pessoa</p>
                    <p>Dividido por 4 pessoas: R$ {(cost / 4).toFixed(2).replace('.', ',')} por pessoa</p>
                    <p>Dividido por 5 pessoas: R$ {(cost / 5).toFixed(2).replace('.', ',')} por pessoa</p>
                  </div>
                )}
              </div>
            )}
          </TabPanel>

          <TabPanel header="Cálculo Avançado">
            {!showAdvancedResult ? (
              <div className='fields'>

                <div className='inputs'>
                  <InputNumber
                    value={distance}
                    onValueChange={(e) => setDistance(e.value ?? null)}
                    placeholder="Digite a distância (ida e volta)"
                    suffix="km"
                  />

                  <InputNumber
                    value={consumption}
                    onValueChange={(e) => setConsumption(e.value ?? null)}
                    placeholder="Consumo por litro do automóvel"
                    locale="pt-BR"
                    suffix='km/L'
                  />

                  <InputNumber
                    value={fuelPrice}
                    onValueChange={(e) => setFuelPrice(e.value ?? null)}
                    placeholder="Preço do litro do combustível"
                    mode="currency" currency="BRL" locale="pt-BR"
                  />

                  <InputNumber
                    value={toll}
                    onValueChange={(e) => setToll(e.value ?? null)}
                    placeholder="Preço total do pedágio"
                    mode="currency" currency="BRL" locale="pt-BR"
                  />
                </div>

                <div className='selects'>
                  <Dropdown value={selectedPassagers} onChange={(e) => setSelectedPassagers(e.value)} options={passagers} optionLabel="label" placeholder="Selecione a quantidade de passageiros" className="w-full" />

                  <Dropdown value={selectedCondution} onChange={(e) => setSelectedCondution(e.value)} options={condution} optionLabel="label" placeholder="Selecione o modo de condução" className="w-full" />
                </div>

                <div className="radio-group">
                  <label>Ar condicionado:</label>
                  <div className="radios">
                    <div className='radio'>
                      <RadioButton inputId="Yes" name="air" value="Yes" onChange={(e: RadioButtonChangeEvent) => setAir(e.value)} checked={air === 'Yes'} />
                      <label htmlFor="Yes" className="ml-2">Sim</label>
                    </div>

                    <div className='radio'>
                      <RadioButton inputId="No" name="air" value="No" onChange={(e: RadioButtonChangeEvent) => setAir(e.value)} checked={air === 'No'} />
                      <label htmlFor="No" className="ml-2">Não</label>

                    </div>
                  </div>

                </div>

                <div className='footer'>
                  <Button label="Calcular" loading={loading} onClick={calculateAdvanced} disabled={isAdvancedButtonDisabled} />
                </div>
              </div>
            ) : (
              advancedCost && (
                <div className='advanced-container'>
                  <div className='header-result'>
                    <h3>Custo estimado da viagem:</h3>
                    <Button label="Novo cálculo" icon="pi pi-refresh" onClick={resetAdvanced} />
                  </div>

                  <div className='advanced-result'>
                    <div className='result'>
                      <p className='response-range'>
                        R$ {advancedCost.min.toFixed(0)} - R$ {advancedCost.max.toFixed(0)}
                      </p>
                      <Divider layout="vertical" />
                      <p className='average'>Média: R$ {((advancedCost.min + advancedCost.max) / 2).toFixed(2).replace('.', ',')}</p>
                    </div>

                    <div className='infoMore'>
                      {advancedCost.impactos.length > 0 && (
                        <div className='impacts'>
                          <h4>Impactos no consumo:</h4>
                          <ul>
                            {advancedCost.impactos.map((impacto: string, index: number) => (
                              <li key={index}>• {impacto}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Divider layout='vertical' />

                      {selectedPassagers && (
                        <div className='division'>
                          <h4>Divisão do valor:</h4>
                          {selectedPassagers.maxPeople >= 2 && (
                            <p>Dividido por 2 pessoas: R$ {(((advancedCost.min + advancedCost.max) / 2) / 2).toFixed(2).replace('.', ',')} por pessoa</p>
                          )}
                          {selectedPassagers.maxPeople >= 3 && (
                            <p>Dividido por 3 pessoas: R$ {(((advancedCost.min + advancedCost.max) / 2) / 3).toFixed(2).replace('.', ',')} por pessoa</p>
                          )}
                          {selectedPassagers.maxPeople >= 4 && (
                            <p>Dividido por 4 pessoas: R$ {(((advancedCost.min + advancedCost.max) / 2) / 4).toFixed(2).replace('.', ',')} por pessoa</p>
                          )}
                          {selectedPassagers.maxPeople >= 5 && (
                            <p>Dividido por 5 pessoas: R$ {(((advancedCost.min + advancedCost.max) / 2) / 5).toFixed(2).replace('.', ',')} por pessoa</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Divider />

                  <div className='details'>
                    <p><strong>Consumo ajustado:</strong> {advancedCost.consumoAjustado.toFixed(2)} km/L</p>
                    <Divider layout="vertical" />
                    <p><strong>Litros necessários:</strong> {advancedCost.litros.toFixed(2)} L</p>
                    <Divider layout="vertical" />
                    <p><strong>Ajuste total aplicado:</strong> {advancedCost.ajusteTotal > 0 ? '+' : ''}{advancedCost.ajusteTotal}%</p>
                  </div>

                </div>
              )
            )}
          </TabPanel>
        </TabView>


      </div>
    </div>

  )
}

export default App
