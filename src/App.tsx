import { useState, useEffect, useRef } from 'react';
import styles from './App.module.scss';
import { InputNumber } from 'primereact/inputnumber';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { RadioButton } from "primereact/radiobutton";
import type { RadioButtonChangeEvent } from "primereact/radiobutton";
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primeicons/primeicons.css';
// import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { PlacesInput } from './components/PlacesInput';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const _apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
if (_apiKey) {
  (setOptions as any)({ key: _apiKey, version: 'weekly', language: 'pt-BR' });
}

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

  // Google Maps Places
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [distanceMatrixService, setDistanceMatrixService] = useState<google.maps.DistanceMatrixService | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [errorDistance, setErrorDistance] = useState('');
  const originRef = useRef('');
  const destinationRef = useRef('');
  const mapsInitRef = useRef(false);

  useEffect(() => {
    if (mapsInitRef.current || !_apiKey) return;
    mapsInitRef.current = true;

    importLibrary('places')
      .then(() => setMapsLoaded(true))
      .catch(() => setErrorDistance('Erro ao carregar Google Maps'));

    importLibrary('routes')
      .then((lib) => {
        const { DistanceMatrixService } = lib as google.maps.RoutesLibrary;
        setDistanceMatrixService(new DistanceMatrixService());
      })
      .catch(() => {});
  }, []);

  const calcularDistancia = (orig: string, dest: string) => {
    if (!distanceMatrixService || !orig || !dest) return;

    setLoadingDistance(true);
    setErrorDistance('');

    distanceMatrixService.getDistanceMatrix(
      {
        origins: [orig],
        destinations: [dest],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        language: 'pt-BR',
      },
      (response, status) => {
        setLoadingDistance(false);
        if (status !== google.maps.DistanceMatrixStatus.OK || !response) {
          setErrorDistance('Erro ao calcular distância');
          return;
        }
        const element = response.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
          setErrorDistance('Rota não encontrada entre os dois pontos');
          return;
        }
        const km = parseFloat((element.distance.value / 1000).toFixed(2));
        setDistance(km);
        setErrorDistance('');
      }
    );
  };

  const handleOriginSelect = (value: string) => {
    setOrigin(value);
    originRef.current = value;
    setDistance(null);
    setErrorDistance('');
    if (value && destinationRef.current) {
      calcularDistancia(value, destinationRef.current);
    }
  };

  const handleDestinationSelect = (value: string) => {
    setDestination(value);
    destinationRef.current = value;
    setDistance(null);
    setErrorDistance('');
    if (value && originRef.current) {
      calcularDistancia(originRef.current, value);
    }
  };

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
    setLoading(false);
  }

  const resetBasic = () => {
    setDistance(null);
    setConsumption(null);
    setFuelPrice(null);
    setCost(null);
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
    setOrigin('');
    setDestination('');
    originRef.current = '';
    destinationRef.current = '';
    setErrorDistance('');
  }


  return (
    <div className={styles.containerGroup}>
      <div className={styles.giphy}>
        <img src="/gif.gif" alt="Gatinho dirigindo na cidade" className={styles.gif} />
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <img src="/cat-driving.svg" alt="logo" className={styles.logo} />
          <div className={styles.headerDescription}>
            <p className={styles.description}>calculamos o custo da viagem do seu jeito: carro, trajeto e como você dirige.</p>
            <p className={styles.develop}>desenvolvido por <a href='https://matheus-marques-site.vercel.app/' target='_blank'>matheus marques</a>.</p>
          </div>
        </div>

        <TabView>
          <TabPanel header="Cálculo Básico">
            <div className={styles.fields}>
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

              <div className={styles.footer}>
                <Button label="Calcular" loading={loading} onClick={calculate} disabled={isButtonDisabled} />
              </div>
            </div>

            {cost !== null && (
            <div className={styles.responseContainer}>
              <div className={styles.headerResult}>
                <h3>Custo estimado da viagem:</h3>
                <Button label="Novo cálculo" icon="pi pi-refresh" onClick={resetBasic} className={styles.btnReset} />
                <Button label="" icon="pi pi-refresh" onClick={resetBasic} className={styles.btnResetResponsive} />
              </div>

              <div className={styles.responseResult}>
                <p className={styles.responseRange}>{cost !== null ? `R$ ${cost.toFixed(2).replace('.', ',')}` : '—'}</p>
              </div>

              <Divider />

              {cost !== null && (
                <div className={styles.division}>
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
            <div className={styles.fields}>

                <div className={styles.placesGroup}>
                  <PlacesInput
                    label="Ponto de Partida"
                    value={origin}
                    onChange={handleOriginSelect}
                    placeholder="Digite sua origem (ex: São Paulo, SP)"
                    mapsLoaded={mapsLoaded}
                  />

                  <PlacesInput
                    label="Destino"
                    value={destination}
                    onChange={handleDestinationSelect}
                    placeholder="Digite seu destino (ex: Rio de Janeiro, RJ)"
                    mapsLoaded={mapsLoaded}
                  />

                  <div className={styles.distanceInfo}>
                    {loadingDistance ? (
                      <span className={styles.distanceLoading}>Calculando distância...</span>
                    ) : errorDistance ? (
                      <span className={styles.distanceError}>{errorDistance}</span>
                    ) : distance !== null ? (
                      <span className={styles.distanceValue}>Distância calculada: <strong>{distance} km</strong> (ida e volta)</span>
                    ) : (
                      <span className={styles.distancePlaceholder}>Digite a origem e o destino para calcular a distância automaticamente.</span>
                    )}
                  </div>
                </div>

                <div className={styles.inputsThree}>
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

                <div className={styles.selects}>
                  <Dropdown value={selectedPassagers} onChange={(e) => setSelectedPassagers(e.value)} options={passagers} optionLabel="label" placeholder="Selecione a quantidade de passageiros" className="w-full" />

                  <Dropdown value={selectedCondution} onChange={(e) => setSelectedCondution(e.value)} options={condution} optionLabel="label" placeholder="Selecione o modo de condução" className="w-full" />
                </div>

                <div className={styles.radioGroup}>
                  <label>Ar condicionado:</label>
                  <div className={styles.radios}>
                    <div className={styles.radio}>
                      <RadioButton inputId="Yes" name="air" value="Yes" onChange={(e: RadioButtonChangeEvent) => setAir(e.value)} checked={air === 'Yes'} />
                      <label htmlFor="Yes" className="ml-2">Sim</label>
                    </div>

                    <div className={styles.radio}>
                      <RadioButton inputId="No" name="air" value="No" onChange={(e: RadioButtonChangeEvent) => setAir(e.value)} checked={air === 'No'} />
                      <label htmlFor="No" className="ml-2">Não</label>

                    </div>
                  </div>

                </div>

                <div className={styles.footer}>
                  <Button label="Calcular" loading={loading} onClick={calculateAdvanced} disabled={isAdvancedButtonDisabled} />
                </div>
              </div>

            {advancedCost && (
            <div className={styles.advancedContainer}>
              <div className={styles.headerResult}>
                <h3>Custo estimado da viagem:</h3>
                <Button label="Novo cálculo" icon="pi pi-refresh" onClick={resetAdvanced} className={styles.btnReset} />
                <Button label="" icon="pi pi-refresh" onClick={resetAdvanced} className={styles.btnResetResponsive} />
              </div>

              <>
                  <div className={styles.advancedResult}>
                    <div className={styles.result}>
                      <p className={styles.responseRange}>
                        R$ {advancedCost.min.toFixed(0)} - R$ {advancedCost.max.toFixed(0)}
                      </p>
                      <Divider layout="vertical" />
                      <p className={styles.average}>Média: R$ {((advancedCost.min + advancedCost.max) / 2).toFixed(2).replace('.', ',')}</p>
                    </div>

                    <div className={styles.infoMore}>
                      {advancedCost.impactos.length > 0 && (
                        <div className={styles.impacts}>
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
                        <div className={styles.division}>
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

                  <div className={styles.details}>
                    <p><strong>Consumo ajustado:</strong> {advancedCost.consumoAjustado.toFixed(2)} km/L</p>

                    <Divider layout="vertical" />

                    <p><strong>Litros necessários:</strong> {advancedCost.litros.toFixed(2)} L</p>

                    <Divider layout="vertical" />

                    <p><strong>Ajuste total aplicado:</strong> {advancedCost.ajusteTotal > 0 ? '+' : ''}{advancedCost.ajusteTotal}%</p>
                  </div>
                </>
            </div>
            )}
          </TabPanel>
        </TabView>

      </div>
    </div>

  )
}

export default App
