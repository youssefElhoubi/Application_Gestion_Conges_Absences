"use client";

import * as React from "react";
import {
  Sparkles,
  Layers,
  Database,
  FileCheck2,
  AlertTriangle,
  Calendar,
  Clock,
  Shield,
  ArrowUpRight,
  Filter,
} from "lucide-react";

import { PageContainer } from "@/src/components/layout/PageContainer";
import {
  PageHeader,
  SectionHeader,
  DataCard,
  StatCard,
  StatusBadge,
  FilterBar,
  ActiveFilter,
  ConfirmDialog,
} from "@/src/components/shared";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
} from "@/src/components/ui";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  CardGridSkeleton,
  Alert,
} from "@/src/components/feedback";
import {
  DataTable,
  ColumnDef,
} from "@/src/components/table/DataTable";
import {
  FormField,
  FormInput,
  FormSelect,
  FormDatePicker,
  FormFileUpload,
  FormActions,
} from "@/src/components/form";

// Sample typed data row for demonstrating the generic DataTable
interface SampleDataRecord {
  id: string;
  reference: string;
  category: string;
  assignee: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ACTIVE";
  date: string;
  count: number;
}

const sampleTableData: SampleDataRecord[] = [
  {
    id: "rec-1",
    reference: "REF-2026-001",
    category: "Congé Payé Annuel",
    assignee: "Karim Alami",
    status: "APPROVED",
    date: "2026-10-15",
    count: 3.5,
  },
  {
    id: "rec-2",
    reference: "REF-2026-002",
    category: "Récupération Férié",
    assignee: "Fatima Benjelloun",
    status: "PENDING",
    date: "2026-10-18",
    count: 1.0,
  },
  {
    id: "rec-3",
    reference: "REF-2026-003",
    category: "Autorisation Exceptionnelle",
    assignee: "Youssef Tazi",
    status: "APPROVED",
    date: "2026-10-22",
    count: 2.0,
  },
  {
    id: "rec-4",
    reference: "REF-2026-004",
    category: "Maladie Ordinaire",
    assignee: "Sara Berrada",
    status: "REJECTED",
    date: "2026-10-10",
    count: 4.0,
  },
  {
    id: "rec-5",
    reference: "REF-2026-005",
    category: "Congé Maternité",
    assignee: "Mona Chaoui",
    status: "ACTIVE",
    date: "2026-11-01",
    count: 14.0,
  },
  {
    id: "rec-6",
    reference: "REF-2026-006",
    category: "Congé Sans Solde",
    assignee: "Omar Idrissi",
    status: "CANCELLED",
    date: "2026-10-05",
    count: 5.0,
  },
];

export default function FoundationShowcasePage() {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "table" | "form" | "states" | "dialogs"
  >("overview");

  // State for interactive features
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<(string | number)[]>([]);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [dateValue, setDateValue] = React.useState("2026-10-20");
  const [activeFilters, setActiveFilters] = React.useState<ActiveFilter[]>([
    { id: "status", label: "Statut", valueLabel: "Tous" },
  ]);
  const [bannerVisible, setBannerVisible] = React.useState(true);

  // Table columns definition with strict types
  const tableColumns: ColumnDef<SampleDataRecord>[] = [
    {
      id: "reference",
      header: "Référence",
      sortable: true,
      cell: (row: SampleDataRecord) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.reference}
        </span>
      ),
    },
    {
      id: "category",
      header: "Catégorie",
      sortable: true,
      cell: (row: SampleDataRecord) => (
        <span className="font-medium text-foreground">{row.category}</span>
      ),
    },
    {
      id: "assignee",
      header: "Bénéficiaire",
      sortable: true,
      cell: (row: SampleDataRecord) => (
        <span className="text-muted-foreground">{row.assignee}</span>
      ),
    },
    {
      id: "status",
      header: "Statut",
      sortable: true,
      cell: (row: SampleDataRecord) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      id: "count",
      header: "Durée (Jours)",
      align: "right",
      sortable: true,
      cell: (row: SampleDataRecord) => (
        <span className="font-semibold text-foreground">
          {row.count} j
        </span>
      ),
    },
    {
      id: "date",
      header: "Date d'effet",
      align: "right",
      sortable: true,
      cell: (row: SampleDataRecord) => (
        <span className="text-xs text-muted-foreground">{row.date}</span>
      ),
    },
  ];

  const handleConfirmAction = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
    }, 1000);
  };

  return (
    <PageContainer>
      {/* Top Banner */}
      {bannerVisible && (
        <Alert
          variant="info"
          title="Architecture Frontend — Fondation Entreprise"
          onDismiss={() => setBannerVisible(false)}
        >
          Ce socle technique fournit l&apos;intégralité des primitives, layouts, tableaux,
          formulaires et états UX requis pour les futurs modules du système de gestion des congés (Loi 65-99).
        </Alert>
      )}

      {/* Page Header */}
      <PageHeader
        title="Socle Frontend & Système de Design"
        description="Architecture unifiée de l'interface utilisateur : navigation responsive, tableaux génériques, formulaires accessibles et tokens de design."
        badge={
          <Badge variant="outline" className="text-primary border-primary/30">
            Version 1.0 • Prêt pour production
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("table")}
            >
              <Database className="h-4 w-4 mr-1.5" />
              Tester le tableau
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Modal interactif
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-border gap-1 overflow-x-auto pb-px">
        {[
          { key: "overview", label: "Vue d'ensemble", icon: Layers },
          { key: "table", label: "Standard Tableau (DataTable)", icon: Database },
          { key: "form", label: "Standard Formulaires", icon: FileCheck2 },
          { key: "states", label: "États UX (Loading/Error/Empty)", icon: AlertTriangle },
          { key: "dialogs", label: "Modales & Primitives", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-md"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Stat Cards Row */}
          <div>
            <SectionHeader
              title="Cartes d'indicateurs (StatCard)"
              description="Primitives KPI standardisées avec suivi de tendance et codes couleurs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <StatCard
                title="Collaborateurs Actifs"
                value="248"
                trend={{ value: "+12 ce mois", direction: "up" }}
                icon={<Layers className="h-5 w-5" />}
                description="Répartis sur 3 sites de travail"
                valueColor="primary"
              />
              <StatCard
                title="Demandes en Attente"
                value="14"
                trend={{ value: "+3 aujourd'hui", direction: "neutral" }}
                icon={<Clock className="h-5 w-5" />}
                description="Nécessite validation managériale"
                valueColor="warning"
              />
              <StatCard
                title="Jours Pris (Mois en cours)"
                value="82.5 j"
                trend={{ value: "-8% vs N-1", direction: "down" }}
                icon={<Calendar className="h-5 w-5" />}
                description="Taux d'absence : 3.4%"
                valueColor="success"
              />
              <StatCard
                title="Crédits Récupération"
                value="36 j"
                icon={<Sparkles className="h-5 w-5" />}
                description="Générés par les jours fériés travaillés"
                valueColor="default"
              />
            </div>
          </div>

          {/* Core UI Primitives Demo */}
          <div>
            <SectionHeader
              title="Primitives d'interface fondamentales"
              description="Boutons, badges de statut, conteneurs de données"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Buttons & Badges */}
              <DataCard
                title="Boutons & Variantes sémantiques"
                description="Styles cohérents avec retours d'état de chargement et d'accessibilité"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="primary" isLoading>Chargement</Button>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Badges de statut (StatusBadge)
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <StatusBadge status="PENDING" />
                      <StatusBadge status="APPROVED" />
                      <StatusBadge status="REJECTED" />
                      <StatusBadge status="CANCELLED" />
                      <StatusBadge status="ACTIVE" />
                      <StatusBadge status="INACTIVE" />
                    </div>
                  </div>
                </div>
              </DataCard>

              {/* Data Card with Actions */}
              <DataCard
                title="Conteneur de données (DataCard)"
                description="Structure type pour l'affichage de métriques et d'informations ciblées"
                icon={<Shield className="h-5 w-5" />}
                actions={
                  <Button variant="ghost" size="xs">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                }
                footer={
                  <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
                    <span>Dernière synchronisation : il y a 5 min</span>
                    <span className="font-semibold text-primary cursor-pointer hover:underline">
                      Consulter les détails →
                    </span>
                  </div>
                }
              >
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Le composant <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono">DataCard</code> assure
                    une cohérence visuelle stricte sur tous les modules du système : padding responsive,
                    en-tête typé, slot d&apos;actions et pied de page informatif.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <Badge variant="secondary">Prêt pour réutilisation</Badge>
                    <Badge variant="outline">Accessible WCAG</Badge>
                  </div>
                </div>
              </DataCard>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE STANDARD */}
      {activeTab === "table" && (
        <div className="space-y-6 animate-fadeIn">
          <SectionHeader
            title="Standard de Tableau de Données (DataTable<T>)"
            description="Composant générique intégrant recherche, tri, filtres avancés, pagination avec sélecteur de taille, et sélection multiple avec barre d'actions."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setActiveFilters(
                    activeFilters.length > 0
                      ? []
                      : [
                          { id: "status", label: "Statut", valueLabel: "Tous" },
                          { id: "site", label: "Site", valueLabel: "Casablanca" },
                        ]
                  )
                }
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                {activeFilters.length > 0 ? "Réinitialiser filtres" : "Activer filtres démo"}
              </Button>
            }
          />

          {/* Filter Bar Standard */}
          <FilterBar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Rechercher par référence, collaborateur, motif..."
            activeFilters={activeFilters}
            onRemoveFilter={(fId) =>
              setActiveFilters((prev) => prev.filter((item) => item.id !== fId))
            }
            onResetFilters={() => setActiveFilters([])}
            totalResults={sampleTableData.length}
          >
            <div className="flex items-center gap-2">
              <Select
                className="w-36 text-xs h-8"
                defaultValue="all"
                options={[
                  { value: "all", label: "Tous les statuts" },
                  { value: "APPROVED", label: "Approuvé" },
                  { value: "PENDING", label: "En attente" },
                ]}
              />
            </div>
          </FilterBar>

          {/* Reusable DataTable Component */}
          <DataTable
            data={sampleTableData}
            columns={tableColumns}
            keyExtractor={(row) => row.id}
            isSelectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            batchActions={
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => alert(`Export de ${selectedIds.length} lignes`)}
                >
                  Exporter ({selectedIds.length})
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => alert(`Annulation de ${selectedIds.length} lignes`)}
                >
                  Annuler sélection
                </Button>
              </div>
            }
            emptyTitle="Aucun enregistrement"
            emptyDescription="Aucune donnée ne correspond aux critères de recherche."
          />
        </div>
      )}

      {/* TAB 3: FORM STANDARD */}
      {activeTab === "form" && (
        <div className="max-w-3xl space-y-6 animate-fadeIn">
          <SectionHeader
            title="Standard d'Expérience de Formulaire"
            description="Champs typés, labels obligatoires, sélecteur de date avec presets, téléversement de justificatifs et gestion des retours de validation."
          />

          <Card>
            <CardHeader>
              <CardTitle>Spécimen de Formulaire Réutilisable</CardTitle>
              <CardDescription>
                Démontre les composants de saisie conformes à la charte et aux contraintes d&apos;accessibilité.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Form Input */}
              <FormInput
                label="Identifiant / Matricule Collaborateur"
                required
                placeholder="Ex. MAT-0428"
                description="Identifiant unique conforme au registre du personnel"
                defaultValue="MAT-0428"
              />

              {/* Form Select */}
              <FormSelect
                label="Type de Motif ou Catégorie"
                required
                placeholder="Sélectionnez une catégorie"
                options={[
                  { value: "cp", label: "Congé Payé Annuel (1.5 j/mois)" },
                  { value: "recup", label: "Récupération Férié Travaillé" },
                  { value: "mariage", label: "Mariage du Collaborateur (4 jours)" },
                  { value: "naissance", label: "Naissance d'un Enfant (3 jours)" },
                  { value: "deces", label: "Décès d'un Parent Proche (2 jours)" },
                ]}
                defaultValue="cp"
                description="Règles d'acquisition conformes au Code du Travail marocain"
              />

              {/* Form Date Picker with Quick Presets */}
              <FormField
                label="Date d'effet / Date de Début"
                required
                description="Sélectionnez une date ou utilisez l'un des raccourcis rapides"
              >
                <FormDatePicker
                  value={dateValue}
                  onDateChange={setDateValue}
                  quickPresets={[
                    { label: "Aujourd'hui", daysOffset: 0 },
                    { label: "Demain", daysOffset: 1 },
                    { label: "Dans 7 jours", daysOffset: 7 },
                    { label: "Dans 14 jours", daysOffset: 14 },
                  ]}
                />
              </FormField>

              {/* Form File Upload */}
              <FormFileUpload
                label="Pièce justificative (Certificat médical, convocation...)"
                description="Format PDF, PNG ou JPG (Taille maximale : 5 Mo)"
                value={selectedFile}
                onChange={setSelectedFile}
              />

              {/* Example with validation error */}
              <FormInput
                label="Exemple de Champ avec Erreur de Validation"
                required
                error="Le nombre de jours demandés dépasse le solde disponible (Solde actuel : 4.5 j)"
                defaultValue="10"
              />

              {/* Form Actions */}
              <FormActions
                submitLabel="Valider et Enregistrer"
                cancelLabel="Annuler les modifications"
                onCancel={() => alert("Action d'annulation déclenchée")}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: UX STATES */}
      {activeTab === "states" && (
        <div className="space-y-8 animate-fadeIn">
          <SectionHeader
            title="Normes des États Utilisateurs (UX States)"
            description="Comportements visuels standardisés pour l'état vide, l'état d'erreur et les skeletons de chargement."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Empty State */}
            <Card>
              <CardHeader>
                <CardTitle>État Vide (EmptyState)</CardTitle>
                <CardDescription>
                  Utilisé lorsqu&apos;aucune donnée n&apos;est disponible ou aucun résultat trouvé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="Aucune demande d'absence"
                  description="Vous n'avez actuellement aucune demande en cours de validation ou archivée."
                  actionLabel="Créer une nouvelle demande"
                  onAction={() => alert("Création d'une nouvelle demande")}
                  secondaryActionLabel="Voir le calendrier"
                  onSecondaryAction={() => alert("Navigation vers calendrier")}
                />
              </CardContent>
            </Card>

            {/* Error State */}
            <Card>
              <CardHeader>
                <CardTitle>État d&apos;Erreur (ErrorState)</CardTitle>
                <CardDescription>
                  Affiché en cas d&apos;échec réseau, de panne serveur ou de droit refusé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorState
                  title="Échec de chargement des données"
                  message="Impossible d'interroger le service de calcul des soldes. Veuillez vérifier votre connexion."
                  errorCode="ERR_NETWORK_503"
                  onRetry={() => alert("Nouvelle tentative en cours...")}
                />
              </CardContent>
            </Card>
          </div>

          {/* Skeletons */}
          <Card>
            <CardHeader>
              <CardTitle>Skeletons de Chargement (LoadingSkeleton)</CardTitle>
              <CardDescription>
                Animation shimmer préservant la structure visuelle avant le rendu des données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Skeleton de Tableau (TableSkeleton)
                </p>
                <TableSkeleton rows={3} columns={5} />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Skeleton de Grille de Cartes (CardGridSkeleton)
                </p>
                <CardGridSkeleton count={3} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: DIALOGS & CONFIRM */}
      {activeTab === "dialogs" && (
        <div className="max-w-2xl space-y-6 animate-fadeIn">
          <SectionHeader
            title="Modales et Boîtes de Dialogue Primitives"
            description="Dialogues accessibles avec trappe de focus, écoute de la touche Échap et verrouillage du défilement."
          />

          <DataCard
            title="Boîte de dialogue de Confirmation (ConfirmDialog)"
            description="Standard pour les opérations destructives ou sensibles"
            icon={<Shield className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cliquez ci-dessous pour ouvrir une boîte de dialogue interactive
                utilisant notre composant <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ConfirmDialog</code>.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  Tester la boîte de confirmation
                </Button>
              </div>
            </div>
          </DataCard>
        </div>
      )}

      {/* Interactive Confirm Dialog Instance */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        title="Confirmer l'opération sensible"
        description="Cette action est irréversible. Êtes-vous sûr de vouloir poursuivre cette opération sur le dossier ?"
        confirmLabel="Oui, confirmer"
        cancelLabel="Annuler"
        variant="destructive"
        isLoading={confirmLoading}
      />
    </PageContainer>
  );
}
