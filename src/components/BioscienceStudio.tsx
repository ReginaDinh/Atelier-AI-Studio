import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as $3Dmol from '3dmol';
import {
  Dna,
  Atom,
  FlaskConical,
  BookOpen,
  Search,
  ExternalLink,
  Sparkles,
  Cloud,
  Trash2,
  Send,
  Layers,
  Eye,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Globe,
  Loader2,
  BookmarkCheck,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  SavedBioscienceRecord,
  saveBioscienceRecordToFirestore,
  deleteBioscienceRecordFromFirestore,
} from '../firebase';

interface BioscienceStudioProps {
  isDark?: boolean;
  firebaseUser?: any;
  savedRecords?: SavedBioscienceRecord[];
  onSendToChat?: (promptText: string) => void;
  onTriggerGoogleLogin?: () => void;
}

type WorkbenchTab = 'protein' | 'genomics' | 'chemistry' | 'literature';

interface QuickExample {
  label: string;
  sub: string;
  tab: WorkbenchTab;
  query: string;
  pdbFallback?: string;
}

const QUICK_EXAMPLES: QuickExample[] = [
  { label: 'TP53', sub: 'P04637 • Tumor Suppressor', tab: 'protein', query: 'TP53', pdbFallback: '1TUP' },
  { label: 'BRCA1', sub: 'P38398 • DNA Repair', tab: 'protein', query: 'BRCA1', pdbFallback: '1JM7' },
  { label: 'EGFR', sub: 'P00533 • Kinase Receptor', tab: 'protein', query: 'EGFR', pdbFallback: '1M17' },
  { label: 'PCSK9', sub: 'Q8NBP7 • Lipid Metabolism', tab: 'genomics', query: 'PCSK9', pdbFallback: '2P4E' },
  { label: 'Imatinib', sub: 'CHEMBL941 • Kinase Inhibitor', tab: 'chemistry', query: 'Imatinib' },
  { label: 'Aspirin', sub: 'CID 2244 • COX Inhibitor', tab: 'chemistry', query: 'Aspirin' },
];

export const BioscienceStudio: React.FC<BioscienceStudioProps> = ({
  firebaseUser,
  savedRecords = [],
  onSendToChat,
  onTriggerGoogleLogin,
}) => {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('protein');
  const [searchInput, setSearchInput] = useState<string>('TP53');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Protein & 3D Structure State
  const [proteinData, setProteinData] = useState<any>(null);
  const [alphafoldData, setAlphafoldData] = useState<any>(null);
  const [activePdbId, setActivePdbId] = useState<string>('');
  const [structureSource, setStructureSource] = useState<'alphafold' | 'pdb'>('alphafold');
  const [repStyle, setRepStyle] = useState<'cartoon' | 'stick' | 'surface'>('cartoon');
  const [colorMode, setColorMode] = useState<'plddt' | 'spectrum' | 'chain'>('plddt');
  const [hoveredResidue, setHoveredResidue] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState<boolean>(false);

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerInstanceRef = useRef<any>(null);
  const rawStructureTextRef = useRef<{ data: string; format: 'pdb' | 'cif'; source: 'alphafold' | 'pdb' } | null>(null);
  const repStyleRef = useRef<'cartoon' | 'stick' | 'surface'>(repStyle);
  const colorModeRef = useRef<'plddt' | 'spectrum' | 'chain'>(colorMode);
  const didInitRef = useRef(false);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    repStyleRef.current = repStyle;
  }, [repStyle]);

  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);

  useEffect(() => {
    return () => {
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.clear();
        } catch (_) {}
        viewerInstanceRef.current = null;
      }
      if (viewerContainerRef.current) {
        viewerContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  // 2. Genomics & ClinVar State
  const [clinvarVariants, setClinvarVariants] = useState<any[]>([]);
  const [genomicsGene, setGenomicsGene] = useState<string>('TP53');

  // 3. Chemistry & Drug Discovery State
  const [compoundProps, setCompoundProps] = useState<any>(null);
  const [chemblInfo, setChemblInfo] = useState<any>(null);
  const [mechanisms, setMechanisms] = useState<any[]>([]);

  // 4. Biomedical Literature State
  const [papers, setPapers] = useState<any[]>([]);
  const [arxivPreprints, setArxivPreprints] = useState<any[]>([]);

  // 5. Live Google Search Grounding State (gemini-3.8-flash)
  const [groundingLoading, setGroundingLoading] = useState<boolean>(false);
  const [groundingResult, setGroundingResult] = useState<{
    text: string;
    sources: Array<{ title: string; uri: string }>;
    webSearchQueries: string[];
  } | null>(null);

  // 6. Cloud Save Status
  const [savingCloud, setSavingCloud] = useState<boolean>(false);
  const [cloudBanner, setCloudBanner] = useState<string | null>(null);
  const [showCloudDrawer, setShowCloudDrawer] = useState<boolean>(false);

  // Apply 3Dmol representation & coloring
  const applyViewerStyle = useCallback(
    (viewer: any, rep: 'cartoon' | 'stick' | 'surface', colorScheme: 'plddt' | 'spectrum' | 'chain', sourceType: 'alphafold' | 'pdb') => {
      if (!viewer) return;
      viewer.setStyle({}, {}); // clear existing styles
      viewer.removeAllSurfaces();

      const colorfunc = (atom: any) => {
        const b = typeof atom.b === 'number' ? atom.b : 85;
        if (b > 90) return '#0053D6';
        if (b >= 70) return '#65CBF3';
        if (b >= 50) return '#FFDB13';
        return '#FF7D45';
      };

      let styleSpec: any = {};
      if (colorScheme === 'plddt' && sourceType === 'alphafold') {
        styleSpec = { colorfunc };
      } else if (colorScheme === 'spectrum') {
        styleSpec = { color: 'spectrum' };
      } else {
        styleSpec = { colorscheme: 'chainHetatm' };
      }

      if (rep === 'cartoon') {
        viewer.setStyle({}, { cartoon: styleSpec });
      } else if (rep === 'stick') {
        viewer.setStyle({}, { cartoon: { ...styleSpec, opacity: 0.45 }, stick: { radius: 0.16 } });
      } else if (rep === 'surface') {
        viewer.setStyle({}, { cartoon: styleSpec });
        viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.72, color: '#94a3b8' });
      }

      // Highlight HETATM ligands if present in experimental PDB
      viewer.setStyle({ hetflag: true }, { stick: { colorscheme: 'greenCarbon', radius: 0.22 } });
      viewer.render();
    },
    []
  );

  // Render 3D structure into container
  const renderStructureIn3Dmol = useCallback(
    (coordData: string, format: 'pdb' | 'cif', sourceType: 'alphafold' | 'pdb') => {
      const container = viewerContainerRef.current;
      if (!container) return;
      try {
        if (viewerInstanceRef.current) {
          try {
            viewerInstanceRef.current.clear();
          } catch (_) {}
          viewerInstanceRef.current = null;
        }
        container.innerHTML = '';
        viewerInstanceRef.current = $3Dmol.createViewer(container, {
          backgroundColor: '#090d16',
          antialias: true,
        });
        const viewer = viewerInstanceRef.current;
        viewer.clear();
        viewer.addModel(coordData, format);

        applyViewerStyle(viewer, repStyleRef.current, colorModeRef.current, sourceType);

        // Hover callback for residue inspection
        viewer.setHoverable(
          {},
          true,
          (atom: any) => {
            if (atom) {
              const scoreLabel =
                sourceType === 'alphafold'
                  ? `pLDDT: ${Number(atom.b || 0).toFixed(1)}`
                  : `B-factor: ${Number(atom.b || 0).toFixed(1)}`;
              setHoveredResidue(`Chain ${atom.chain || 'A'} • ${atom.resn}${atom.resi} (${atom.atom}) • ${scoreLabel}`);
            }
          },
          () => {
            setHoveredResidue(null);
          }
        );

        viewer.zoomTo();
        viewer.render();
        setViewerReady(true);
      } catch (err) {
        console.error('3Dmol render error:', err);
      }
    },
    [applyViewerStyle]
  );

  // Re-apply style when representation or colorMode changes
  useEffect(() => {
    if (viewerInstanceRef.current && rawStructureTextRef.current && activeTab === 'protein') {
      applyViewerStyle(
        viewerInstanceRef.current,
        repStyle,
        colorMode,
        rawStructureTextRef.current.source
      );
    }
  }, [repStyle, colorMode, activeTab, applyViewerStyle]);

  // Re-mount viewer when switching back to protein tab
  useEffect(() => {
    if (activeTab === 'protein' && rawStructureTextRef.current && viewerContainerRef.current) {
      const timer = setTimeout(() => {
        if (rawStructureTextRef.current) {
          renderStructureIn3Dmol(
            rawStructureTextRef.current.data,
            rawStructureTextRef.current.format,
            rawStructureTextRef.current.source
          );
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab, renderStructureIn3Dmol]);

  // 1. Fetch Protein + AlphaFold / PDB
  const fetchProteinWorkbench = useCallback(
    async (queryStr: string, fallbackPdb?: string) => {
      const seq = ++searchSeqRef.current;
      setIsLoading(true);
      setErrorMsg(null);
      setAlphafoldData(null);
      const clean = queryStr.trim();
      try {
        // Check if query is a 4-char PDB ID (starts with digit 1-9)
        const isDirectPdb = /^[1-9][A-Za-z0-9]{3}$/.test(clean);
        if (isDirectPdb) {
          const pdbIdUpper = clean.toUpperCase();
          const pdbRes = await fetch(`https://files.rcsb.org/download/${pdbIdUpper}.pdb`);
          if (seq !== searchSeqRef.current) return;
          if (!pdbRes.ok) throw new Error(`RCSB PDB structure not found: ${pdbIdUpper}`);
          const pdbText = await pdbRes.text();
          if (seq !== searchSeqRef.current) return;
          setActivePdbId(pdbIdUpper);
          setStructureSource('pdb');
          rawStructureTextRef.current = { data: pdbText, format: 'pdb', source: 'pdb' };
          renderStructureIn3Dmol(pdbText, 'pdb', 'pdb');
          setIsLoading(false);
          return;
        }

        // Otherwise query UniProtKB (prefer reviewed human entries first, fallback to general search)
        const uniprotUrl = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(
          `(${clean}) AND (reviewed:true)`
        )}&format=json&size=1`;
        let uniRes = await fetch(uniprotUrl);
        if (seq !== searchSeqRef.current) return;
        let uniJson = await uniRes.json();
        if (seq !== searchSeqRef.current) return;

        if (!uniJson.results || uniJson.results.length === 0) {
          uniRes = await fetch(
            `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(clean)}&format=json&size=1`
          );
          if (seq !== searchSeqRef.current) return;
          uniJson = await uniRes.json();
          if (seq !== searchSeqRef.current) return;
        }

        if (!uniJson.results || uniJson.results.length === 0) {
          throw new Error(`No UniProtKB data found for "${clean}". Try a gene symbol (e.g., TP53, BRCA1, EGFR).`);
        }

        const entry = uniJson.results[0];
        const accession = entry.primaryAccession;
        const geneSymbol = entry.genes?.[0]?.geneName?.value || clean.toUpperCase();
        const proteinName =
          entry.proteinDescription?.recommendedName?.fullName?.value ||
          entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
          geneSymbol;
        const organism = entry.organism?.scientificName || 'Homo sapiens';
        const seqLength = entry.sequence?.length || 0;
        const sequenceValue = entry.sequence?.value || '';

        const functionComment =
          entry.comments?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value ||
          'Molecular function being curated from UniProtKB.';

        const features = (entry.features || [])
          .filter((f: any) =>
            ['Domain', 'Active site', 'Binding site', 'Region', 'DNA binding', 'Zinc finger'].includes(f.type)
          )
          .slice(0, 8)
          .map((f: any) => ({
            type: f.type,
            description: f.description || f.type,
            start: f.location?.start?.value || 1,
            end: f.location?.end?.value || 1,
          }));

        const pdbCrossRefs = (entry.uniProtKBCrossReferences || [])
          .filter((xref: any) => xref.database === 'PDB')
          .slice(0, 6)
          .map((xref: any) => xref.id);

        setProteinData({
          accession,
          geneSymbol,
          proteinName,
          organism,
          seqLength,
          sequenceValue,
          functionComment,
          features,
          pdbCrossRefs,
        });

        // Query AlphaFold DB API for this UniProt accession
        let loaded3D = false;
        try {
          const afRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${accession}`);
          if (seq !== searchSeqRef.current) return;
          if (afRes.ok) {
            const afJson = await afRes.json();
            if (seq !== searchSeqRef.current) return;
            const afEntry = Array.isArray(afJson) ? afJson[0] : afJson;
            if (afEntry && (afEntry.pdbUrl || afEntry.cifUrl)) {
              setAlphafoldData(afEntry);
              const structUrl = afEntry.pdbUrl || afEntry.cifUrl;
              const format: 'pdb' | 'cif' = afEntry.pdbUrl ? 'pdb' : 'cif';
              const coordRes = await fetch(structUrl);
              if (seq !== searchSeqRef.current) return;
              if (coordRes.ok) {
                const coordText = await coordRes.text();
                if (seq !== searchSeqRef.current) return;
                setStructureSource('alphafold');
                setActivePdbId(`AF-${accession}`);
                rawStructureTextRef.current = { data: coordText, format, source: 'alphafold' };
                renderStructureIn3Dmol(coordText, format, 'alphafold');
                loaded3D = true;
              }
            }
          }
        } catch (afErr) {
          console.warn('AlphaFold fetch fallback to RCSB PDB:', afErr);
        }

        // Fallback to experimental PDB if AlphaFold structure unavailable
        if (!loaded3D) {
          const targetPdb = pdbCrossRefs[0] || fallbackPdb || '1TUP';
          const pdbRes = await fetch(`https://files.rcsb.org/download/${targetPdb}.pdb`);
          if (seq !== searchSeqRef.current) return;
          if (pdbRes.ok) {
            const pdbText = await pdbRes.text();
            if (seq !== searchSeqRef.current) return;
            setStructureSource('pdb');
            setActivePdbId(targetPdb);
            rawStructureTextRef.current = { data: pdbText, format: 'pdb', source: 'pdb' };
            renderStructureIn3Dmol(pdbText, 'pdb', 'pdb');
          }
        }
      } catch (err: any) {
        if (seq !== searchSeqRef.current) return;
        setErrorMsg(err.message || 'Failed to load Protein data & 3D Structure.');
      } finally {
        if (seq === searchSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [renderStructureIn3Dmol]
  );

  // Switch between AlphaFold and specific experimental PDB cross-reference
  const loadSpecificPdb = async (pdbId: string) => {
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    try {
      const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
      if (seq !== searchSeqRef.current) return;
      if (!res.ok) throw new Error(`Failed to fetch PDB ${pdbId}`);
      const text = await res.text();
      if (seq !== searchSeqRef.current) return;
      setStructureSource('pdb');
      setActivePdbId(pdbId);
      setColorMode('spectrum');
      rawStructureTextRef.current = { data: text, format: 'pdb', source: 'pdb' };
      renderStructureIn3Dmol(text, 'pdb', 'pdb');
    } catch (e: any) {
      if (seq !== searchSeqRef.current) return;
      setErrorMsg(e.message);
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 2. Fetch Genomics & ClinVar Variants
  const fetchGenomicsWorkbench = useCallback(async (geneQuery: string) => {
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    const cleanGene = geneQuery.trim().toUpperCase();
    setGenomicsGene(cleanGene);
    try {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(
        `${cleanGene}[gene] AND ("clinsig pathogenic"[Properties] OR "clinsig likely pathogenic"[Properties])`
      )}&retmode=json&retmax=10`;
      const searchRes = await fetch(searchUrl);
      if (seq !== searchSeqRef.current) return;
      const searchJson = await searchRes.json();
      if (seq !== searchSeqRef.current) return;
      const ids: string[] = searchJson?.esearchresult?.idlist || [];

      if (ids.length === 0) {
        setClinvarVariants([]);
        setIsLoading(false);
        return;
      }

      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(
        ','
      )}&retmode=json`;
      const summaryRes = await fetch(summaryUrl);
      if (seq !== searchSeqRef.current) return;
      const summaryJson = await summaryRes.json();
      if (seq !== searchSeqRef.current) return;
      const resultObj = summaryJson?.result || {};

      const parsed = ids
        .map((id: string) => {
          const item = resultObj[id];
          if (!item) return null;
          const clinicalSig =
            item.germline_classification?.description ||
            item.clinical_significance?.description ||
            'Pathogenic / Likely pathogenic';
          const reviewStatus =
            item.germline_classification?.review_status ||
            item.clinical_significance?.review_status ||
            'criteria provided';
          const traitSet =
            item.germline_classification?.trait_set || item.trait_set || [];
          const conditions = traitSet
            .map((t: any) => t.trait_name)
            .filter(Boolean)
            .join(', ');
          const variationSet = item.variation_set?.[0] || {};
          const loc = variationSet.variation_loc?.find((l: any) => l.assembly_name === 'GRCh38') ||
            variationSet.variation_loc?.[0];

          return {
            uid: id,
            title: item.title || variationSet.variation_name || `Variant #${id}`,
            clinicalSig,
            reviewStatus,
            conditions: conditions || 'Clinical genetic condition',
            chr: loc?.chr || '—',
            start: loc?.start || '—',
            consequence: item.molecular_consequence_list?.join(', ') || 'Missense / Coding variant',
          };
        })
        .filter(Boolean);

      setClinvarVariants(parsed);
    } catch (err: any) {
      if (seq !== searchSeqRef.current) return;
      setErrorMsg(err.message || 'Failed to query NCBI ClinVar.');
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // 3. Fetch Chemistry & Drug Discovery (PubChem + ChEMBL)
  const fetchChemistryWorkbench = useCallback(async (compoundQuery: string) => {
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    const cleanName = compoundQuery.trim();
    try {
      const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
        cleanName
      )}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES,IUPACName,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON`;

      const propRes = await fetch(propUrl);
      if (seq !== searchSeqRef.current) return;
      if (!propRes.ok) {
        throw new Error(`Compound "${cleanName}" not found on PubChem. Try a drug name (e.g., Imatinib, Aspirin, Metformin, Gefitinib).`);
      }
      const propJson = await propRes.json();
      if (seq !== searchSeqRef.current) return;
      const props = propJson?.PropertyTable?.Properties?.[0];
      if (!props) throw new Error('Empty PubChem property data.');

      setCompoundProps({
        name: cleanName,
        ...props,
        image2DUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.CID}/PNG?record_type=2d&image_size=large`,
      });

      // Also query ChEMBL for Bioactivity / Clinical Phase / Mechanism of Action
      try {
        const chemblRes = await fetch(
          `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(cleanName)}&limit=1`
        );
        if (seq !== searchSeqRef.current) return;
        if (chemblRes.ok) {
          const chemblJson = await chemblRes.json();
          if (seq !== searchSeqRef.current) return;
          const mol = chemblJson?.molecules?.[0];
          if (mol) {
            setChemblInfo({
              chemblId: mol.molecule_chembl_id,
              prefName: mol.pref_name || cleanName,
              maxPhase: mol.max_phase,
              moleculeType: mol.molecule_type,
              firstApproval: mol.first_approval,
              ro5Violations: mol.molecule_properties?.num_ro5_violations,
              qedWeighted: mol.molecule_properties?.qed_weighted,
            });

            if (mol.molecule_chembl_id) {
              const mechRes = await fetch(
                `https://www.ebi.ac.uk/chembl/api/data/mechanism.json?molecule_chembl_id=${mol.molecule_chembl_id}`
              );
              if (seq !== searchSeqRef.current) return;
              if (mechRes.ok) {
                const mechJson = await mechRes.json();
                if (seq !== searchSeqRef.current) return;
                setMechanisms(mechJson?.mechanisms || []);
              }
            }
          } else {
            setChemblInfo(null);
            setMechanisms([]);
          }
        }
      } catch (chemblErr) {
        console.warn('ChEMBL lookup warning:', chemblErr);
      }
    } catch (err: any) {
      if (seq !== searchSeqRef.current) return;
      setErrorMsg(err.message || 'Failed to query PubChem / ChEMBL compound.');
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // 4. Fetch Biomedical Literature (Europe PMC + arXiv proxy)
  const fetchLiteratureWorkbench = useCallback(async (topicQuery: string) => {
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    const cleanQ = topicQuery.trim();
    try {
      const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
        cleanQ
      )}&format=json&pageSize=6&resultType=core`;
      const epmcRes = await fetch(epmcUrl);
      if (seq !== searchSeqRef.current) return;
      const epmcJson = await epmcRes.json();
      if (seq !== searchSeqRef.current) return;
      const results = epmcJson?.resultList?.result || [];
      setPapers(results);

      // Fetch arXiv preprints via server proxy
      try {
        const arxivRes = await fetch(`/api/arxiv?q=${encodeURIComponent(`all:${cleanQ}`)}&max_results=4`);
        if (seq !== searchSeqRef.current) return;
        if (arxivRes.ok) {
          const xmlText = await arxivRes.text();
          if (seq !== searchSeqRef.current) return;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const entries = Array.from(xmlDoc.querySelectorAll('entry')).map(entry => ({
            id: entry.querySelector('id')?.textContent?.trim() || '',
            title: entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || '',
            summary: entry.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '',
            published: entry.querySelector('published')?.textContent?.slice(0, 10) || '',
            authors: Array.from(entry.querySelectorAll('author name'))
              .slice(0, 3)
              .map(a => a.textContent)
              .join(', '),
          }));
          setArxivPreprints(entries);
        }
      } catch (arxivErr) {
        console.warn('arXiv proxy warning:', arxivErr);
      }
    } catch (err: any) {
      if (seq !== searchSeqRef.current) return;
      setErrorMsg(err.message || 'Failed to query Europe PMC / PubMed literature.');
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Run Live Google Search Grounding via gemini-3.8-flash
  const runGoogleSearchGrounding = async (customQuery?: string) => {
    const targetQ = customQuery || searchInput.trim();
    if (!targetQ) return;
    setGroundingLoading(true);
    try {
      let contextSummary = '';
      if (activeTab === 'protein' && proteinData) {
        contextSummary = `Protein: ${proteinData.geneSymbol} (${proteinData.accession}) - ${proteinData.proteinName}. Function: ${proteinData.functionComment}`;
      } else if (activeTab === 'genomics') {
        contextSummary = `Gene: ${genomicsGene}, Pathogenic ClinVar variants: ${clinvarVariants.length}`;
      } else if (activeTab === 'chemistry' && compoundProps) {
        contextSummary = `Compound: ${compoundProps.name} (CID: ${compoundProps.CID}), Formula: ${compoundProps.MolecularFormula}, MW: ${compoundProps.MolecularWeight} Da, ChEMBL: ${chemblInfo?.chemblId || 'N/A'}`;
      }

      const res = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Synthesize recent biomedical literature, molecular mechanisms, clinical mutations, or trials for: ${targetQ}`, foreign: true,
          context: contextSummary,
          domain: 'bioscience',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search grounding failed');
      setGroundingResult({
        text: data.text || '',
        sources: data.sources || [],
        webSearchQueries: data.webSearchQueries || [],
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'Google Search Grounding query failed.');
    } finally {
      setGroundingLoading(false);
    }
  };

  // Initial load on mount: auto-load TP53 so the user lands directly on a live 3D molecular + genomic workspace
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchProteinWorkbench('TP53', '1TUP');
  }, [fetchProteinWorkbench]);

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setGroundingResult(null);
    if (activeTab === 'protein') {
      fetchProteinWorkbench(searchInput);
    } else if (activeTab === 'genomics') {
      fetchGenomicsWorkbench(searchInput);
    } else if (activeTab === 'chemistry') {
      fetchChemistryWorkbench(searchInput);
    } else if (activeTab === 'literature') {
      fetchLiteratureWorkbench(searchInput);
    }
  };

  const handleSelectExample = (ex: QuickExample) => {
    setActiveTab(ex.tab);
    setSearchInput(ex.query);
    setGroundingResult(null);
    if (ex.tab === 'protein') {
      fetchProteinWorkbench(ex.query, ex.pdbFallback);
    } else if (ex.tab === 'genomics') {
      fetchGenomicsWorkbench(ex.query);
    } else if (ex.tab === 'chemistry') {
      fetchChemistryWorkbench(ex.query);
    } else if (ex.tab === 'literature') {
      fetchLiteratureWorkbench(ex.query);
    }
  };

  // Save current active entity to Firestore Cloud
  const handleSaveToCloud = async () => {
    if (!firebaseUser) {
      if (onTriggerGoogleLogin) onTriggerGoogleLogin();
      return;
    }
    setSavingCloud(true);
    setCloudBanner(null);
    try {
      let identifier = searchInput.trim();
      let title = searchInput.trim();
      let summary = '';
      let sourceUrl = '';

      if (activeTab === 'protein' && proteinData) {
        identifier = proteinData.accession;
        title = `${proteinData.geneSymbol} (${proteinData.accession}) — ${proteinData.proteinName}`;
        summary = `${proteinData.functionComment}\nSequence Length: ${proteinData.seqLength} aa. 3D Structure: ${activePdbId}.`;
        sourceUrl = `https://www.uniprot.org/uniprotkb/${proteinData.accession}`;
      } else if (activeTab === 'genomics') {
        identifier = genomicsGene;
        title = `ClinVar Pathogenic Variants — ${genomicsGene} (${clinvarVariants.length} variants)`;
        summary = clinvarVariants
          .slice(0, 5)
          .map(v => `${v.title}: ${v.clinicalSig} (${v.conditions})`)
          .join(' | ') || `Variant data for gene ${genomicsGene}`;
        sourceUrl = `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(genomicsGene + '[gene]')}`;
      } else if (activeTab === 'chemistry' && compoundProps) {
        identifier = `CID_${compoundProps.CID}`;
        title = `${compoundProps.name} (CID ${compoundProps.CID} • ${compoundProps.MolecularFormula})`;
        summary = `MW: ${compoundProps.MolecularWeight} Da | XLogP: ${compoundProps.XLogP ?? 'N/A'} | SMILES: ${compoundProps.CanonicalSMILES || compoundProps.IsomericSMILES || ''}`;
        sourceUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${compoundProps.CID}`;
      } else if (activeTab === 'literature') {
        identifier = searchInput.trim().replace(/\s+/g, '_').slice(0, 50);
        title = `PubMed/Europe PMC Synthesis: ${searchInput.trim()}`;
        summary = papers
          .slice(0, 4)
          .map(p => `${p.title} (${p.pubYear || ''}, PMID: ${p.pmid || 'N/A'})`)
          .join(' • ') || 'Biomedical literature record';
        sourceUrl = `https://europepmc.org/search?query=${encodeURIComponent(searchInput.trim())}`;
      }

      if (groundingResult?.text) {
        summary = `${summary}\n\n[Google Search Grounding]: ${groundingResult.text.slice(0, 1200)}`;
      }

      await saveBioscienceRecordToFirestore({
        category: activeTab,
        identifier,
        title,
        summary: summary || 'Molecular bioscience research record.',
        sourceUrl,
      });

      setCloudBanner('Saved research record to Cloud Firestore successfully!');
      setTimeout(() => setCloudBanner(null), 4000);
    } catch (err: any) {
      setErrorMsg('Unable to save to Cloud Firestore. Please check Google sign-in.');
    } finally {
      setSavingCloud(false);
    }
  };

  // Lipinski Rule of 5 Evaluation Helper
  const evaluateLipinski = (props: any) => {
    if (!props) return null;
    const mw = Number(props.MolecularWeight || 0);
    const logp = typeof props.XLogP === 'number' ? props.XLogP : Number(props.XLogP || 0);
    const hbd = Number(props.HBondDonorCount || 0);
    const hba = Number(props.HBondAcceptorCount || 0);

    const rules = [
      { label: 'Molecular Weight (MW ≤ 500 Da)', value: `${mw.toFixed(1)} Da`, pass: mw <= 500 },
      { label: 'Lipophilicity (XLogP ≤ 5)', value: `${logp.toFixed(2)}`, pass: logp <= 5 },
      { label: 'H-Bond Donors (HBD ≤ 5)', value: `${hbd}`, pass: hbd <= 5 },
      { label: 'H-Bond Acceptors (HBA ≤ 10)', value: `${hba}`, pass: hba <= 10 },
    ];
    const violations = rules.filter(r => !r.pass).length;
    return { rules, violations, drugLike: violations <= 1 };
  };

  const lipinskiEval = evaluateLipinski(compoundProps);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070a12] text-slate-100">
      {/* Top Scientific Workbench Bar */}
      <div className="px-3 sm:px-6 py-3 border-b border-white/[0.08] bg-[#0b101d]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
            <Dna className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                Bioscience & Molecular Research Studio
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                AlphaFold • UniProt • ClinVar • PubChem
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1">
               WebGL 3D Molecular Simulation, ClinVar Variant Mapping, Lipinski Drug Screening & Search Grounding
            </p>
          </div>
        </div>

        {/* Quick-Try Example Pill Bar (Science Skill Rule: never start blank) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
          <span className="text-[11px] text-slate-400 mr-1 font-medium shrink-0">Examples:</span>
          {QUICK_EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => handleSelectExample(ex)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border shrink-0 ${
                searchInput.toUpperCase() === ex.query.toUpperCase() && activeTab === ex.tab
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm'
                  : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
              }`}
              title={ex.sub}
            >
              {ex.label}
            </button>
          ))}

          <button
            onClick={() => setShowCloudDrawer(!showCloudDrawer)}
            className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 flex items-center gap-1.5 transition-all shrink-0"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud ({savedRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Module Switcher + Search Bar + Live Grounding Trigger */}
      <div className="px-3 sm:px-6 py-2.5 border-b border-white/[0.06] bg-[#090d18] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.07] overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => {
              setActiveTab('protein');
              if (!proteinData) fetchProteinWorkbench('TP53', '1TUP');
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'protein'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Atom className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">1. 3D Structure</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('genomics');
              if (clinvarVariants.length === 0) fetchGenomicsWorkbench(searchInput || 'TP53');
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'genomics'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Dna className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">2. Genomics & ClinVar</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('chemistry');
              if (!compoundProps) {
                setSearchInput('Imatinib');
                fetchChemistryWorkbench('Imatinib');
              }
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'chemistry'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">3. Medicinal Chemistry</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('literature');
              if (papers.length === 0) fetchLiteratureWorkbench(searchInput || 'TP53');
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'literature'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">4. PubMed Literature</span>
          </button>
        </div>

        {/* Search Input + Actions */}
        <form onSubmit={handleExecuteSearch} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 flex-1 min-w-[260px] max-w-xl">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={
                activeTab === 'protein'
                  ? 'Enter Gene, UniProt or PDB ID (e.g., TP53, BRCA1, P04637, 1TUP)...'
                  : activeTab === 'genomics'
                  ? 'Enter Gene symbol for ClinVar variants (e.g., TP53, BRCA1, EGFR, PCSK9)...'
                  : activeTab === 'chemistry'
                  ? 'Enter drug or compound name (e.g., Imatinib, Aspirin, Gefitinib, Olaparib)...'
                  : 'Enter biomedical topic for PubMed / arXiv (e.g., CRISPR base editing)...'
              }
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => runGoogleSearchGrounding()}
            disabled={groundingLoading}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-medium text-xs flex items-center gap-1.5 transition-all"
            title="Use Gemini 3.8 Flash + Google Search Grounding for real-time scientific synthesis"
          >
            {groundingLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Google Grounding</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={savingCloud}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 font-medium text-xs flex items-center gap-1.5 transition-all"
            title="Save analysis record to Cloud Firestore database"
          >
            {savingCloud ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookmarkCheck className="w-3.5 h-3.5" />
            )}
            <span>Save Cloud</span>
          </button>
        </form>
      </div>

      {/* Status Banners */}
      {cloudBanner && (
        <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{cloudBanner}</span>
          </div>
          <button onClick={() => setCloudBanner(null)} className="text-emerald-300 hover:text-white text-xs">
            Close
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white text-xs">
            Close
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Cloud Saved Records Drawer (when toggled) */}
        {showCloudDrawer && (
          <div className="p-4 rounded-2xl bg-[#0d1323] border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Cloud Research Archive (Firebase Firestore)
                </h3>
              </div>
              {!firebaseUser && (
                <button
                  onClick={onTriggerGoogleLogin}
                  className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-400"
                >
                  Sign in with Google to sync Cloud
                </button>
              )}
            </div>

            {savedRecords.length === 0 ? (
              <p className="text-xs text-slate-400">
                {firebaseUser
                  ? 'No records saved yet. Click "Save Cloud" above to archive protein structures, ClinVar variants, or drug compounds.'
                  : 'Sign in with Google to store and sync molecular bioscience data across devices with Firebase Firestore.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedRecords.map(rec => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300">
                          {rec.category} • {rec.identifier}
                        </span>
                        <button
                          onClick={() => deleteBioscienceRecordFromFirestore(rec.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete record from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-semibold text-white line-clamp-1">{rec.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{rec.summary}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                      {rec.sourceUrl ? (
                        <a
                          href={rec.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span />
                      )}
                      {onSendToChat && (
                        <button
                          onClick={() =>
                            onSendToChat(`Perform deep scientific analysis on saved record: ${rec.title}\n\n${rec.summary}`)
                          }
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send to Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Google Search Grounding Synthesis Card (if executed) */}
        {groundingResult && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0c1424] to-[#0b101d] border border-emerald-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Google Search Grounded • Gemini 3.8 Flash
                </span>
                <span className="text-xs text-slate-400">
                  Real-time Synthesis from Google Search Grounding
                </span>
              </div>
              {onSendToChat && (
                <button
                  onClick={() =>
                    onSendToChat(
                      `Deeply analyze the following Google Search Grounding scientific synthesis for ${searchInput}:\n\n${groundingResult.text}`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Continue in Chat</span>
                </button>
              )}
            </div>

            <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
              {groundingResult.text}
            </div>

            {groundingResult.sources.length > 0 && (
              <div className="pt-3 border-t border-white/[0.08]">
                <div className="text-[11px] font-semibold text-slate-400 mb-2">
                  Verified Sources from Google Search ({groundingResult.sources.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {groundingResult.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[11px] text-cyan-300 flex items-center gap-1.5 max-w-xs truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: 3D PROTEIN & ALPHAFOLD WORKBENCH */}
        {activeTab === 'protein' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Interactive 3Dmol.js WebGL Canvas + Controls + Confidence Legend */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="rounded-2xl bg-[#090d16] border border-white/[0.1] overflow-hidden shadow-xl flex flex-col">
                {/* Canvas Header */}
                <div className="px-4 py-3 border-b border-white/[0.08] bg-[#0d1322] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {activePdbId || '3D VIEWER'}
                    </span>
                    {structureSource === 'alphafold' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        [Predicted by AlphaFold DB]
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        [Experimentally determined • RCSB PDB]
                      </span>
                    )}
                  </div>

                  {/* Representation & Coloring Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
                      {(['cartoon', 'stick', 'surface'] as const).map(style => (
                        <button
                          key={style}
                          onClick={() => setRepStyle(style)}
                          className={`px-2 py-1 rounded-md text-[11px] capitalize transition-all ${
                            repStyle === style
                              ? 'bg-cyan-500 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
                      {(['plddt', 'spectrum', 'chain'] as const).map(cm => (
                        <button
                          key={cm}
                          onClick={() => setColorMode(cm)}
                          className={`px-2 py-1 rounded-md text-[11px] uppercase font-mono transition-all ${
                            colorMode === cm
                              ? 'bg-indigo-500 text-white font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cm}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        if (viewerInstanceRef.current) {
                          viewerInstanceRef.current.zoomTo();
                          viewerInstanceRef.current.render();
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                      title="Reset 3D Camera view"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3Dmol WebGL Viewport */}
                <div className="relative w-full h-[300px] sm:h-[430px] bg-[#090d16]">
                  <div
                    ref={viewerContainerRef}
                    className="w-full h-full relative"
                  />
                  {!viewerReady && isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d16]/80 backdrop-blur-sm z-10 gap-2">
                      <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                      <span className="text-xs text-slate-300 font-mono">
                        Rendering 3D molecular structure...
                      </span>
                    </div>
                  )}

                  {/* Residue Hover Readout Pill */}
                  <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-white/[0.12] text-[11px] font-mono text-cyan-200 backdrop-blur-md">
                      {hoveredResidue || 'Hover over 3D structure to view amino acid coordinates & pLDDT score'}
                    </div>
                  </div>
                </div>

                {/* Canonical AlphaFold 4-Band pLDDT Confidence Legend (Required by Science Skill) */}
                <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0b101d] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    AlphaFold Confidence Metric (pLDDT):
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#0053D6]" />
                      <span className="text-slate-300">&gt;90 Very High</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#65CBF3]" />
                      <span className="text-slate-300">70–90 Confident</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#FFDB13]" />
                      <span className="text-slate-300">50–70 Low</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#FF7D45]" />
                      <span className="text-slate-300">&lt;50 Very Low (IDR)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: UniProtKB Functional Annotation, Domains & Cross-References */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {proteinData ? (
                <div className="p-5 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold font-mono text-white">
                          {proteinData.geneSymbol}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          UniProt: {proteinData.accession}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-slate-300">
                          {proteinData.seqLength} aa
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-slate-200 mt-1">
                        {proteinData.proteinName}
                      </h3>
                      <p className="text-xs italic text-slate-400">{proteinData.organism}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <a
                        href={`https://www.uniprot.org/uniprotkb/${proteinData.accession}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 text-xs flex items-center gap-1"
                      >
                        <span>UniProtKB</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://alphafold.ebi.ac.uk/entry/${proteinData.accession}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-blue-300 text-xs flex items-center gap-1"
                      >
                        <span>AlphaFold DB</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Function Summary */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                        Biological Function (Curated UniProtKB)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">[Literature curated]</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {proteinData.functionComment}
                    </p>
                  </div>

                  {/* 1D Sequence Domain & Active Site Track */}
                  {proteinData.features && proteinData.features.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Domains & Active Sites (1D Sequence Track)</span>
                        <span className="font-mono text-[11px] text-slate-400">1 — {proteinData.seqLength} aa</span>
                      </div>
                      <div className="space-y-1.5">
                        {proteinData.features.map((feat: any, i: number) => {
                          const leftPct = Math.max(
                            0,
                            Math.min(95, Math.round((feat.start / (proteinData.seqLength || 1)) * 100))
                          );
                          const widthPct = Math.max(
                            4,
                            Math.min(100 - leftPct, Math.round(((feat.end - feat.start + 1) / (proteinData.seqLength || 1)) * 100))
                          );
                          return (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-slate-200">
                                  <span className="text-cyan-400 font-mono mr-1.5">[{feat.type}]</span>
                                  {feat.description}
                                </span>
                                <span className="font-mono text-slate-400">
                                  aa {feat.start}–{feat.end}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                  style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Experimental RCSB PDB Cross-References */}
                  {proteinData.pdbCrossRefs && proteinData.pdbCrossRefs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                      <span className="text-xs font-semibold text-slate-300">
                        Switch to experimental RCSB PDB structure (X-ray / Cryo-EM):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {proteinData.pdbCrossRefs.map((pdb: string) => (
                          <button
                            key={pdb}
                            onClick={() => loadSpecificPdb(pdb)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                              activePdbId === pdb
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                            }`}
                          >
                            PDB: {pdb}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send to Chat Button */}
                  {onSendToChat && (
                    <button
                      onClick={() =>
                        onSendToChat(
                          `Analyze 3D structure and molecular mechanisms of protein ${proteinData.geneSymbol} (UniProt: ${proteinData.accession} - ${proteinData.proteinName}). Curated function: ${proteinData.functionComment}`
                        )
                      }
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Protein Data to Chat / LaTeX Studio</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#0c1221] border border-white/[0.08] text-xs text-slate-400">
                  Enter a Gene symbol or UniProt accession to load molecular structure.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GENOMICS & CLINVAR PATHOGENIC VARIANTS */}
        {activeTab === 'genomics' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#0c1221] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-mono">
                    NCBI ClinVar Clinical Variants — Gene {genomicsGene}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Pathogenic / Likely Pathogenic
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Human genetic variants from NCBI ClinVar (GRCh38) cross-referenced with AlphaGenome Atlas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(genomicsGene + '[gene]')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <span>Open NCBI ClinVar</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://deepmind.google.com/science/alphagenome"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-1.5"
                >
                  <span>AlphaGenome Regulatory Atlas</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {clinvarVariants.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0c1221] border border-white/[0.08] text-center text-xs text-slate-400">
                {isLoading
                  ? 'Querying NCBI ClinVar clinical variant database...'
                  : `No direct pathogenic variants found for "${genomicsGene}". Try TP53, BRCA1, EGFR, or PCSK9.`}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#0c1221] border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase text-slate-400">
                        <th className="py-3 px-4">ClinVar ID</th>
                        <th className="py-3 px-4">Variant / HGVS</th>
                        <th className="py-3 px-4">Clinical Significance</th>
                        <th className="py-3 px-4">Molecular Consequence</th>
                        <th className="py-3 px-4">GRCh38 Position</th>
                        <th className="py-3 px-4">Associated Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-xs">
                      {clinvarVariants.map(v => (
                        <tr key={v.uid} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono text-cyan-300">
                            <a
                              href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${v.uid}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>#{v.uid}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-white">
                            {v.title}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {v.clinicalSig}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{v.reviewStatus}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{v.consequence}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            chr{v.chr}:{v.start}
                          </td>
                          <td className="py-3 px-4 text-slate-200 max-w-xs">{v.conditions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHEMISTRY & DRUG DISCOVERY (PUBCHEM + CHEMBL + LIPINSKI RO5) */}
        {activeTab === 'chemistry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {compoundProps ? (
              <>
                {/* Left 5 Cols: 2D Structure Depiction + Chemical Identifiers */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        PubChem CID: {compoundProps.CID}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1 capitalize">
                        {compoundProps.name}
                      </h3>
                    </div>
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compoundProps.CID}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-cyan-300 flex items-center gap-1"
                    >
                      <span>PubChem</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* 2D Chemical Structure Image from PubChem PUG REST */}
                  <div className="w-full h-56 rounded-xl bg-white flex items-center justify-center p-3 overflow-hidden">
                    <img
                      src={compoundProps.image2DUrl}
                      alt={compoundProps.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                      <span className="text-slate-400">Molecular Formula:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {compoundProps.MolecularFormula}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                      <span className="text-slate-400">Polar Surface Area (TPSA):</span>
                      <span className="font-mono text-white">{compoundProps.TPSA ?? 'N/A'} Å²</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                      <span className="text-slate-400">Rotatable Bonds:</span>
                      <span className="font-mono text-white">{compoundProps.RotatableBondCount ?? 'N/A'}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-slate-400 block">Canonical SMILES:</span>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-[11px] text-emerald-300 break-all">
                        {compoundProps.CanonicalSMILES || compoundProps.IsomericSMILES || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 7 Cols: Lipinski Rule of 5 Scorecard + ChEMBL Clinical Bioactivity */}
                <div className="lg:col-span-7 space-y-4">
                  {lipinskiEval && (
                    <div className="p-5 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            Lipinski Rule of 5 Pharmacokinetic Screening (Oral Bioavailability)
                          </h4>
                          <p className="text-xs text-slate-400">
                            Oral bioavailability assessment based on four physicochemical thresholds
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                            lipinskiEval.drugLike
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {lipinskiEval.drugLike
                            ? `DRUG-LIKE COMPLIANT (${lipinskiEval.violations} violations)`
                            : `ALERT (${lipinskiEval.violations} Ro5 violations)`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lipinskiEval.rules.map((r, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between"
                          >
                            <div>
                              <div className="text-[11px] text-slate-400">{r.label}</div>
                              <div className="text-sm font-mono font-bold text-white mt-0.5">
                                {r.value}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                r.pass
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {r.pass ? 'PASS' : 'VIOLATION'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ChEMBL Clinical Trial & Mechanism of Action Card */}
                  <div className="p-5 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        Pharmacology & Bioactivity Profile (ChEMBL)
                      </h4>
                      {chemblInfo?.chemblId && (
                        <a
                          href={`https://www.ebi.ac.uk/chembl/compound_report_card/${chemblInfo.chemblId}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono flex items-center gap-1"
                        >
                          <span>{chemblInfo.chemblId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {chemblInfo ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="text-slate-400 text-[11px]">Clinical Phase</div>
                            <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
                              Phase {chemblInfo.maxPhase ?? 'N/A'}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="text-slate-400 text-[11px]">Molecule Type</div>
                            <div className="font-mono font-bold text-white text-sm mt-0.5">
                              {chemblInfo.moleculeType || 'Small molecule'}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="text-slate-400 text-[11px]">First Approval Year</div>
                            <div className="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                              {chemblInfo.firstApproval || 'Investigational'}
                            </div>
                          </div>
                        </div>

                        {mechanisms.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <div className="text-xs font-semibold text-slate-300">
                              Mechanism of Action (MoA):
                            </div>
                            {mechanisms.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                              >
                                <span className="font-medium text-white">
                                  {m.mechanism_of_action}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[11px]">
                                  {m.action_type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No ChEMBL clinical mechanism record available for this compound.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="lg:col-span-12 p-8 rounded-2xl bg-[#0c1221] border border-white/[0.08] text-center text-xs text-slate-400">
                {isLoading
                  ? 'Analyzing medicinal chemistry from PubChem & ChEMBL...'
                  : 'Enter drug or compound name (e.g., Imatinib, Aspirin) to view structure and evaluate Lipinski Rule of 5.'}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BIOMEDICAL LITERATURE (EUROPE PMC / PUBMED + ARXIV) */}
        {activeTab === 'literature' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Europe PMC / PubMed Peer-Reviewed Articles */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Biomedical Papers: PubMed & Europe PMC ({papers.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">[Peer-Reviewed Indexed]</span>
              </div>

              {papers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0c1221] border border-white/[0.08] text-xs text-slate-400">
                  {isLoading ? 'Searching PubMed / Europe PMC literature...' : 'Enter keywords to search biomedical literature.'}
                </div>
              ) : (
                papers.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-4 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-2 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {p.pmid && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300">
                            PMID: {p.pmid}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-slate-300">
                          {p.journalTitle || 'Biomedical Journal'} • {p.pubYear}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300">
                          Citations: {p.citedByCount || 0}
                        </span>
                      </div>
                      {p.pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>PubMed</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{p.title}</h4>
                    <p className="text-[11px] text-slate-400">{p.authorString}</p>
                    {p.abstractText && (
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {p.abstractText.replace(/<[^>]+>/g, '')}
                      </p>
                    )}
                    {onSendToChat && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() =>
                            onSendToChat(
                              `Summarize key findings and methodological contributions of PubMed paper (PMID: ${p.pmid}): "${p.title}" (${p.pubYear}) by ${p.authorString}.`
                            )
                          }
                          className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Cite in Chat / LaTeX Studio</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* arXiv Quantitative Biology & AI Preprints */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>arXiv Preprints ({arxivPreprints.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-purple-300">[Preprint Server]</span>
              </div>

              {arxivPreprints.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0c1221] border border-white/[0.08] text-xs text-slate-400">
                  No matching arXiv preprints found.
                </div>
              ) : (
                arxivPreprints.map((arx, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[#0c1221] border border-white/[0.08] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                      <span>arXiv • {arx.published}</span>
                      {arx.id && (
                        <a
                          href={arx.id}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>Open arXiv</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{arx.title}</h4>
                    <p className="text-[11px] text-slate-400">{arx.authors}</p>
                    <p className="text-xs text-slate-300 line-clamp-3">{arx.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
