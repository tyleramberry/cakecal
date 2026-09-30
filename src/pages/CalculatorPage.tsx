import { useState } from 'react';
import { useStore, Ingredient, EstimateIngredient, SavedEstimate, generateId, formatCurrency } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search } from 'lucide-react';

const UNITS = ['lb', 'oz', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'unit', 'fl oz'];
const INGREDIENT_CATEGORIES = ['Flour & dry', 'Dairy & eggs', 'Sugar & sweeteners', 'Fats & oils', 'Flavoring & extracts', 'Decoration & fondant', 'Other'];

type Tab = 'calculator' | 'library' | 'estimates';

export default function CalculatorPage() {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient, savedEstimates, addEstimate, deleteEstimate } = useStore();
  const [tab, setTab] = useState<Tab>('calculator');

  // Calculator state
  const [clientName, setClientName] = useState('');
  const [cakeName, setCakeName] = useState('');
  const [numTiers, setNumTiers] = useState(1);
  const [servings, setServings] = useState(10);
  const [activeTier, setActiveTier] = useState(1);
  const [tierIngredients, setTierIngredients] = useState<Record<number, EstimateIngredient[]>>({ 1: [] });
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(25);
  const [packaging, setPackaging] = useState(0);
  const [misc, setMisc] = useState(0);
  const [quotedPrice, setQuotedPrice] = useState(0);

  // Library state
  const [libSearch, setLibSearch] = useState('');
  const [showIngForm, setShowIngForm] = useState(false);
  const [editIng, setEditIng] = useState<Ingredient | null>(null);
  const [ingForm, setIngForm] = useState({ name: '', price: 0, unitSize: '', category: 'Other' });

  const addIngRow = () => {
    const current = tierIngredients[activeTier] || [];
    setTierIngredients({ ...tierIngredients, [activeTier]: [...current, { id: generateId(), name: '', quantity: 0, unit: 'unit', costPerUnit: 0 }] });
  };

  const updateIngRow = (id: string, field: keyof EstimateIngredient, value: any) => {
    const current = tierIngredients[activeTier] || [];
    setTierIngredients({
      ...tierIngredients,
      [activeTier]: current.map((r) => r.id === id ? { ...r, [field]: value } : r),
    });
  };

  const removeIngRow = (id: string) => {
    const current = tierIngredients[activeTier] || [];
    setTierIngredients({ ...tierIngredients, [activeTier]: current.filter((r) => r.id !== id) });
  };

  const handleTiersChange = (n: number) => {
    setNumTiers(n);
    const newTiers: Record<number, EstimateIngredient[]> = {};
    for (let i = 1; i <= n; i++) newTiers[i] = tierIngredients[i] || [];
    setTierIngredients(newTiers);
    if (activeTier > n) setActiveTier(n);
  };

  // Cost calculations
  const ingredientTotal = Object.values(tierIngredients).flat().reduce((s, r) => s + r.quantity * r.costPerUnit, 0);
  const laborTotal = laborHours * laborRate;
  const grandTotal = ingredientTotal + laborTotal + packaging + misc;
  const costPerServing = servings > 0 ? grandTotal / servings : 0;
  const suggestedPrice = Math.round((grandTotal * 2.5) / 5) * 5;
  const margin = quotedPrice > 0 ? ((quotedPrice - grandTotal) / quotedPrice) * 100 : 0;

  const marginColor = margin >= 50 ? 'bg-sage' : margin >= 30 ? 'bg-gold' : 'bg-destructive';

  const handleSaveEstimate = () => {
    addEstimate({
      id: generateId(), clientName, cakeName, tiers: numTiers, servings,
      dateSaved: new Date().toISOString(), totalCost: grandTotal, quotedPrice, margin,
      tierIngredients, laborHours, laborRate, packaging, misc,
    });
  };

  const handleSaveIngredient = () => {
    const ing: Ingredient = { ...ingForm, id: editIng?.id || generateId() };
    if (editIng) updateIngredient(ing); else addIngredient(ing);
    setShowIngForm(false);
    setEditIng(null);
  };

  const filteredLib = ingredients.filter((i) => i.name.toLowerCase().includes(libSearch.toLowerCase()));

  return (
    <div>
      <h2 className="text-2xl font-display mb-6">Cost Calculator</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['calculator', 'Calculator'], ['library', 'Ingredient Library'], ['estimates', 'Saved Estimates']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-4">
            {/* Order info */}
            <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
              <h3 className="font-display text-base">Order Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Client</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
                <div><Label>Cake</Label><Input value={cakeName} onChange={(e) => setCakeName(e.target.value)} /></div>
                <div><Label>Tiers</Label><Input type="number" min={1} max={10} value={numTiers} onChange={(e) => handleTiersChange(+e.target.value)} /></div>
                <div><Label>Servings</Label><Input type="number" min={1} value={servings} onChange={(e) => setServings(+e.target.value)} /></div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
              <h3 className="font-display text-base">Ingredients</h3>
              <div className="flex gap-1">
                {Array.from({ length: numTiers }, (_, i) => i + 1).map((t) => (
                  <button key={t} onClick={() => setActiveTier(t)} className={`px-3 py-1 rounded-lg text-xs font-medium ${activeTier === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    Tier {t}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {(tierIngredients[activeTier] || []).map((row) => (
                  <div key={row.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input placeholder="Ingredient" value={row.name} onChange={(e) => updateIngRow(row.id, 'name', e.target.value)} list="ingredients-list" className="h-8 text-xs" />
                    </div>
                    <Input type="number" value={row.quantity} onChange={(e) => updateIngRow(row.id, 'quantity', +e.target.value)} className="w-16 h-8 text-xs" placeholder="Qty" />
                    <Select value={row.unit} onValueChange={(v) => updateIngRow(row.id, 'unit', v)}>
                      <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" value={row.costPerUnit} onChange={(e) => updateIngRow(row.id, 'costPerUnit', +e.target.value)} className="w-20 h-8 text-xs" placeholder="$/unit" />
                    <span className="text-xs w-16 text-right text-muted-foreground">{formatCurrency(row.quantity * row.costPerUnit)}</span>
                    <button onClick={() => removeIngRow(row.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addIngRow} className="gap-1"><Plus className="w-3 h-3" /> Add Row</Button>
              <datalist id="ingredients-list">
                {ingredients.map((i) => <option key={i.id} value={i.name} />)}
              </datalist>
            </div>

            {/* Labor */}
            <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
              <h3 className="font-display text-base">Labor</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Hours</Label><Input type="number" min={0} value={laborHours} onChange={(e) => setLaborHours(+e.target.value)} /></div>
                <div><Label>Rate ($/hr)</Label><Input type="number" min={0} value={laborRate} onChange={(e) => setLaborRate(+e.target.value)} /></div>
              </div>
            </div>

            {/* Other costs */}
            <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
              <h3 className="font-display text-base">Other Costs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Packaging ($)</Label><Input type="number" min={0} value={packaging} onChange={(e) => setPackaging(+e.target.value)} /></div>
                <div><Label>Delivery / Misc ($)</Label><Input type="number" min={0} value={misc} onChange={(e) => setMisc(+e.target.value)} /></div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-full lg:w-72 space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-card rounded-lg border-0.5 p-4 space-y-2">
              <h3 className="font-display text-base">Cost Breakdown</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Ingredients</span><span>{formatCurrency(ingredientTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Labor</span><span>{formatCurrency(laborTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Packaging</span><span>{formatCurrency(packaging)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Misc</span><span>{formatCurrency(misc)}</span></div>
                <hr className="border-border" />
                <div className="flex justify-between font-medium"><span>Total Cost</span><span>{formatCurrency(grandTotal)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Per Serving</span><span>{formatCurrency(costPerServing)}</span></div>
              </div>
            </div>

            <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
              <h3 className="font-display text-base">Pricing & Margin</h3>
              <div>
                <Label>Quoted Price ($)</Label>
                <Input type="number" min={0} value={quotedPrice} onChange={(e) => setQuotedPrice(+e.target.value)} className="text-lg font-medium" />
              </div>
              <p className="text-xs text-muted-foreground">Suggested: {formatCurrency(suggestedPrice)} (2.5×)</p>
              <div>
                <div className="flex justify-between text-xs mb-1"><span>Margin</span><span>{margin.toFixed(0)}%</span></div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${marginColor}`} style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={handleSaveEstimate} disabled={!clientName || !cakeName}>Save Estimate</Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'library' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={libSearch} onChange={(e) => setLibSearch(e.target.value)} placeholder="Search ingredients..." className="pl-8 h-8" />
            </div>
            <Button size="sm" onClick={() => { setIngForm({ name: '', price: 0, unitSize: '', category: 'Other' }); setEditIng(null); setShowIngForm(true); }} className="gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLib.map((ing) => (
              <div key={ing.id} className="bg-card rounded-lg border-0.5 p-4 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{ing.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(ing.price)} / {ing.unitSize}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{ing.category}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIngForm(ing); setEditIng(ing); setShowIngForm(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteIngredient(ing.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
          <Dialog open={showIngForm} onOpenChange={setShowIngForm}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="font-display">{editIng ? 'Edit' : 'Add'} Ingredient</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price ($)</Label><Input type="number" step="0.01" value={ingForm.price} onChange={(e) => setIngForm({ ...ingForm, price: +e.target.value })} /></div>
                  <div><Label>Unit Size</Label><Input value={ingForm.unitSize} onChange={(e) => setIngForm({ ...ingForm, unitSize: e.target.value })} placeholder="e.g. 5 lb" /></div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={ingForm.category} onValueChange={(v) => setIngForm({ ...ingForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INGREDIENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowIngForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveIngredient} disabled={!ingForm.name}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tab === 'estimates' && (
        <div className="space-y-2">
          {savedEstimates.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No saved estimates yet</p>}
          {savedEstimates.map((est) => {
            const mColor = est.margin >= 50 ? 'bg-sage/15 text-sage' : est.margin >= 30 ? 'bg-gold/15 text-gold' : 'bg-destructive/15 text-destructive';
            return (
              <div key={est.id} className="bg-card rounded-lg border-0.5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{est.clientName} — {est.cakeName}</p>
                  <p className="text-xs text-muted-foreground">{est.tiers} tier{est.tiers > 1 ? 's' : ''} · {est.servings} servings · {new Date(est.dateSaved).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Cost: {formatCurrency(est.totalCost)}</span>
                  <span className="font-medium">Quote: {formatCurrency(est.quotedPrice)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${mColor}`}>{est.margin.toFixed(0)}%</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteEstimate(est.id)}>Remove</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
