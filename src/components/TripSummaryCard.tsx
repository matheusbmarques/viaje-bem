import React from 'react';
import styles from './TripSummaryCard.module.scss';

interface TripSummaryCardProps {
  origin: string;
  destination: string;
  distance: number | null;
  roundTrip: boolean;
  advancedCost: {
    total: number;
    min: number;
    max: number;
    impactos: string[];
    litros: number;
    consumoAjustado: number;
    ajusteTotal: number;
  };
  selectedPassagers: { label: string; maxPeople: number } | null;
  fuelPrice: number | null;
  consumption: number | null;
  toll: number | null;
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
  return 'repeat(2, 1fr)'; // 4 → 2×2
};

const TripSummaryCard = React.forwardRef<HTMLDivElement, TripSummaryCardProps>(
  ({ origin, destination, distance, roundTrip, advancedCost, selectedPassagers, fuelPrice, consumption, toll }, ref) => {
    const average = (advancedCost.min + advancedCost.max) / 2;

    const formatCurrency = (value: number) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const divisionItems: { value: number; count: number }[] = [];
    if (selectedPassagers) {
      for (let i = 2; i <= selectedPassagers.maxPeople; i++) {
        divisionItems.push({ value: average / i, count: i });
      }
    }

    return (
      <div ref={ref} className={styles.card}>
        <div className={styles.cardHeader}>
          <img src="/cat-driving.svg" alt="cat driving logo" className={styles.logo} />
        </div>

        <div className={styles.route}>
          <div className={styles.routePoint}>
            <span className={styles.routeDot} data-type="origin" />
            <span className={styles.routeLabel}>{origin || 'Origem'}</span>
          </div>
          <div className={styles.routeLine} />
          <div className={styles.routePoint}>
            <span className={styles.routeDot} data-type="destination" />
            <span className={styles.routeLabel}>{destination || 'Destino'}</span>
          </div>
          {roundTrip && (
            <>
              <div className={styles.routeLine} />
              <div className={styles.routePoint}>
                <span className={styles.routeDot} data-type="origin" />
                <span className={styles.routeLabel}>{origin || 'Origem'}</span>
              </div>
            </>
          )}
        </div>

        {distance !== null && (
          <p className={styles.distanceInfo}>
            {distance} km {roundTrip ? '(ida e volta)' : '(somente ida)'}
          </p>
        )}

        <div className={styles.tripChips}>
          {consumption !== null && (
            <div className={styles.chip} data-type="consumption">
              <div className={styles.chipText}>
                <span className={styles.chipValue}>{consumption} km/L</span>
                <span className={styles.chipLabel}>consumo</span>
              </div>
            </div>
          )}
          {fuelPrice !== null && (
            <div className={styles.chip} data-type="fuel">
              <div className={styles.chipText}>
                <span className={styles.chipValue}>{formatCurrency(fuelPrice)}</span>
                <span className={styles.chipLabel}>combustível/L</span>
              </div>
            </div>
          )}
          {toll !== null && (
            <div className={styles.chip} data-type="toll">
              <div className={styles.chipText}>
                <span className={styles.chipValue}>{formatCurrency(toll)}</span>
                <span className={styles.chipLabel}>pedágio</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.costSection}>
          <p className={styles.costLabel}>Custo estimado</p>
          <p className={styles.costRange}>
            {formatCurrency(advancedCost.min)} – {formatCurrency(advancedCost.max)}
          </p>
          <p className={styles.costAverage}>Média: {formatCurrency(average)}</p>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailValue}>{advancedCost.litros.toFixed(2)} L</span>
            <span className={styles.detailLabel}>litros necessários</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailValue}>{advancedCost.consumoAjustado.toFixed(2)} km/L</span>
            <span className={styles.detailLabel}>consumo ajustado</span>
          </div>
          {fuelPrice !== null && (
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{formatCurrency(fuelPrice)}</span>
              <span className={styles.detailLabel}>preço/litro</span>
            </div>
          )}
        </div>

        {advancedCost.impactos.length > 0 && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Impactos no consumo:</p>
            <div
              className={styles.miniCardsGrid}
              style={{ gridTemplateColumns: getGridCols(advancedCost.impactos.length) }}
            >
              {advancedCost.impactos.map((impacto, index) => {
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

        {divisionItems.length > 0 && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Divisão do valor:</p>
            <div
              className={styles.miniCardsGrid}
              style={{ gridTemplateColumns: getGridCols(divisionItems.length) }}
            >
              {divisionItems.map(({ value, count }) => (
                <div key={count} className={styles.miniCard}>
                  <span className={styles.miniCardValue}>{formatCurrency(value)}</span>
                  <span className={styles.miniCardLabel}>para <strong>{count} pessoas</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.footer}>https://catdriving.vercel.app/</p>
      </div>
    );
  }
);

TripSummaryCard.displayName = 'TripSummaryCard';

export default TripSummaryCard;
