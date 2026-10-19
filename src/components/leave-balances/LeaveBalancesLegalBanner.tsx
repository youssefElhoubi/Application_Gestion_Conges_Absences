import * as React from "react";
import { Info } from "lucide-react";

export const LeaveBalancesLegalBanner: React.FC = () => {
  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-muted/20 p-5 text-xs text-muted-foreground space-y-2 shadow-xs">
      <div className="flex items-center gap-2 font-bold text-foreground text-sm">
        <Info className="h-4 w-4 text-primary" />
        Règles de Calcul Statutaires — Code du Travail Marocain (Loi n° 65-99)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 leading-relaxed">
        <div className="space-y-1">
          <span className="font-semibold text-foreground">Acquisition des congés (Art. 231)</span>
          <p>
            1.5 jour ouvrable par mois complet de service effectif (2.0 jours pour les salariés mineurs de moins de 18 ans). L&apos;ouverture des droits à consommation requiert 6 mois d&apos;ancienneté continue.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-foreground">Majoration d&apos;ancienneté (Art. 232)</span>
          <p>
            Majoration de 1.5 jour ouvrable supplémentaire par période entière de 5 années de service, plafonnée à un total statutaire de 30 jours ouvrables par an.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-foreground">Repos Compensateur Férié</span>
          <p>
            Les crédits accordés pour travail lors d&apos;un jour férié officiel n&apos;expirent jamais et sont consommés prioritairement selon la règle chronologique FIFO.
          </p>
        </div>
      </div>
    </div>
  );
};
