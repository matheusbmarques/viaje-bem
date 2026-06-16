import { useState, useEffect, useRef } from 'react';
import styles from './App.module.scss';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { RadioButton } from "primereact/radiobutton";
import type { RadioButtonChangeEvent } from "primereact/radiobutton";
import { InputSwitch } from 'primereact/inputswitch';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primeicons/primeicons.css';
// import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { PlacesInput } from './components/PlacesInput';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { toPng } from 'html-to-image';
import TripSummaryCard from './components/TripSummaryCard';
import { Messages } from 'primereact/messages';

const _apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
if (_apiKey) {
  (setOptions as any)({ key: _apiKey, version: 'weekly', language: 'pt-BR' });
}

const parseImpact = (impacto: string): { percentage: string; label: string } => {
  const match = impacto.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) return { label: match[1].trim(), percentage: match[2] };
  return { label: impacto, percentage: '' };
};

const getGridCols = (count: number): string => {
  if (count === 1) return 'repeat(1, 1fr)';
  if (count === 2) return 'repeat(2, 1fr)';
  if (count === 3) return 'repeat(3, 1fr)';
  return 'repeat(2, 1fr)';
};

function App() {
  const [distance, setDistance] = useState<number | null>(null);
  const [consumption, setConsumption] = useState<number | null>(null);
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);
  const [toll, setToll] = useState<number | null>(null);
  const [isAdvancedButtonDisabled, setIsAdvancedButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedPassagers, setSelectedPassagers] = useState<any>(null);
  const [selectedCondution, setSelectedCondution] = useState<any>(null);
  const [air, setAir] = useState('');
  const [advancedCost, setAdvancedCost] = useState<any>(null);
  const [showAdvancedResult, setShowAdvancedResult] = useState(false);

  // Google Maps Places
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [distanceMatrixService, setDistanceMatrixService] = useState<google.maps.DistanceMatrixService | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [errorDistance, setErrorDistance] = useState('');
  const [roundTrip, setRoundTrip] = useState(false);
  const [sharing, setSharing] = useState(false);

  const summaryCardRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<Messages>(null);

  const effectiveDistance = distance !== null
    ? parseFloat((roundTrip ? distance * 2 : distance).toFixed(2))
    : null;
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
    const km = effectiveDistance ?? NaN;
    const consumo = consumption ?? NaN;
    const preco = fuelPrice ?? NaN;

    const isInvalid =
      isNaN(km) || isNaN(consumo) || isNaN(preco) || consumo <= 0;

    setIsAdvancedButtonDisabled(isInvalid);
  }, [distance, roundTrip, consumption, fuelPrice]);

  const calculateAdvanced = () => {
    setLoading(true);

    const km = effectiveDistance ?? 0;
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

  const handleShare = async () => {
    if (!summaryCardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(summaryCardRef.current, { cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      msgsRef.current?.show([{
        severity: 'success',
        summary: 'Imagem copiada!',
        detail: 'Cole diretamente no WhatsApp ou onde quiser.',
        life: 3500,
        closable: false,
      }]);
    } catch {
      msgsRef.current?.show([{
        severity: 'error',
        summary: 'Erro ao copiar',
        detail: 'Não foi possível copiar a imagem.',
        life: 3500,
        closable: false,
      }]);
    } finally {
      setSharing(false);
    }
  };

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

        <>
            {!showAdvancedResult && (
            <div className={styles.fields}>

                <div className={styles.placesGroup}>
                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Ponto de Partida <span className={styles.badgeRequired}>*</span>
                    </span>
                    <PlacesInput
                      value={origin}
                      onChange={handleOriginSelect}
                      placeholder="Digite sua origem (ex: São Paulo, SP)"
                      mapsLoaded={mapsLoaded}
                    />
                  </div>

                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Destino <span className={styles.badgeRequired}>*</span>
                    </span>
                    <PlacesInput
                      value={destination}
                      onChange={handleDestinationSelect}
                      placeholder="Digite seu destino (ex: Rio de Janeiro, RJ)"
                      mapsLoaded={mapsLoaded}
                    />
                  </div>

                  <div className={styles.distanceInfo}>
                    <div>
                      {loadingDistance ? (
                        <span className={styles.distanceLoading}>Calculando distância...</span>
                      ) : errorDistance ? (
                        <span className={styles.distanceError}>{errorDistance}</span>
                      ) : effectiveDistance !== null ? (
                        <span className={styles.distanceValue}>Distância calculada: <strong>{effectiveDistance} km</strong>{roundTrip ? ' (ida e volta)' : ' (somente ida)'}</span>
                      ) : (
                        <span className={styles.distancePlaceholder}>Digite a origem e o destino para calcular a distância automaticamente.</span>
                      )}
                    </div>
                    <div className={styles.roundTripToggle}>
                      <label htmlFor="roundTrip">Ida e volta</label>
                      <InputSwitch inputId="roundTrip" checked={roundTrip} onChange={(e) => setRoundTrip(e.value)} />
                    </div>
                  </div>
                </div>

                <div className={styles.inputsThree}>
                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Consumo do veículo <span className={styles.badgeRequired}>*</span>
                    </span>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={consumption}
                      onValueChange={(e) => setConsumption(e.value ?? null)}
                      placeholder="ex: 12 km/L"
                      locale="pt-BR"
                      suffix='km/L'
                    />
                  </div>

                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Preço do combustível <span className={styles.badgeRequired}>*</span>
                    </span>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={fuelPrice}
                      onValueChange={(e) => setFuelPrice(e.value ?? null)}
                      placeholder="ex: R$ 6,00"
                      mode="currency" currency="BRL" locale="pt-BR"
                    />
                  </div>

                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Pedágio
                    </span>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={toll}
                      onValueChange={(e) => setToll(e.value ?? null)}
                      placeholder="ex: R$ 30,00"
                      mode="currency" currency="BRL" locale="pt-BR"
                    />
                  </div>
                </div>

                <div className={styles.selects}>
                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Passageiros / carga
                    </span>
                    <Dropdown value={selectedPassagers} onChange={(e) => setSelectedPassagers(e.value)} options={passagers} optionLabel="label" placeholder="Selecione" className="w-full" />
                  </div>

                  <div className={styles.fieldWrapper}>
                    <span className={styles.fieldLabel}>
                      Perfil de condução
                    </span>
                    <Dropdown value={selectedCondution} onChange={(e) => setSelectedCondution(e.value)} options={condution} optionLabel="label" placeholder="Selecione" className="w-full" />
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <span className={styles.fieldLabel}>
                    Ar condicionado
                  </span>
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
            )}

            {advancedCost && (
            <div className={styles.advancedContainer}>
              <Messages ref={msgsRef} className={styles.copyMessage} />
              <div className={styles.headerResult}>
                <h3>Custo estimado da viagem:</h3>
                <div className={styles.headerActions}>
                  <Button
                    label="Copiar imagem"
                    loading={sharing}
                    onClick={handleShare}
                    className={styles.btnShare}
                  />
                  <Button label="Novo cálculo" icon="pi pi-refresh" onClick={resetAdvanced} className={styles.btnReset} />
                  <Button label="" icon="pi pi-refresh" onClick={resetAdvanced} className={styles.btnResetResponsive} />
                </div>
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
                        <div className={styles.miniSection}>
                          <h4>Impactos no consumo:</h4>
                          <div
                            className={styles.miniCardsGrid}
                            style={{ gridTemplateColumns: getGridCols(advancedCost.impactos.length) }}
                          >
                            {advancedCost.impactos.map((impacto: string, index: number) => {
                              const { percentage, label } = parseImpact(impacto);
                              return (
                                <div key={index} className={styles.miniCard}>
                                  {percentage && <span className={styles.miniCardBadge}>{percentage}</span>}
                                  <span className={styles.miniCardLabel}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedPassagers && (() => {
                        const avg = (advancedCost.min + advancedCost.max) / 2;
                        const items = Array.from(
                          { length: selectedPassagers.maxPeople - 1 },
                          (_, i) => i + 2
                        );
                        return (
                          <div className={styles.miniSection}>
                            <h4>Divisão do valor:</h4>
                            <div
                              className={styles.miniCardsGrid}
                              style={{ gridTemplateColumns: getGridCols(items.length) }}
                            >
                              {items.map((count) => (
                                <div key={count} className={styles.miniCard}>
                                  <span className={styles.miniCardValue}>
                                    R$ {(avg / count).toFixed(2).replace('.', ',')}
                                  </span>
                                  <span className={styles.miniCardLabel}>para <strong>{count} pessoas</strong></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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

              {/* Hidden card used only for image generation */}
              <div className={styles.hiddenCard}>
                <TripSummaryCard
                  ref={summaryCardRef}
                  origin={origin}
                  destination={destination}
                  distance={effectiveDistance}
                  roundTrip={roundTrip}
                  advancedCost={advancedCost}
                  selectedPassagers={selectedPassagers}
                  fuelPrice={fuelPrice}
                  consumption={consumption}
                  toll={toll}
                />
              </div>
            </div>
            )}
        </>

      </div>
    </div>

  )
}

export default App
