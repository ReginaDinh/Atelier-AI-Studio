import React from 'react';
import {
  Sparkles,
  Code2,
  PenTool,
  BarChart3,
  Languages,
  Shield,
  Scale,
  Rocket,
  TrendingUp,
  Palette,
  Coins,
  Stethoscope,
  Microscope,
  GraduationCap,
  Bot,
  Zap,
  Gem,
  Brain,
  Target,
  Compass,
  Folder,
  FileText,
  Notebook,
  Landmark,
  Leaf,
  Settings,
  Lightbulb,
  CheckCircle2,
  Cpu,
  Layers,
  Award,
  BookOpen,
  Terminal,
  Flame,
  Globe
} from 'lucide-react';

interface VectorIconProps {
  name?: string;
  size?: number;
  className?: string;
}

/**
 * Renders a crisp Lucide vector icon from either an icon key or legacy emoji token,
 * ensuring zero raw emojis appear in the UI.
 */
export const VectorIcon: React.FC<VectorIconProps> = ({
  name = 'sparkles',
  size = 15,
  className = 'shrink-0',
}) => {
  const key = (name || '').trim();

  switch (key) {
    case '✨':
    case '🌟':
    case 'sparkles':
      return <Sparkles size={size} className={className} />;
    case '💻':
    case 'coder':
    case 'code':
      return <Code2 size={size} className={className} />;
    case '✍️':
    case '✒️':
    case '📝':
    case 'writer':
    case 'pen':
      return <PenTool size={size} className={className} />;
    case '📊':
    case 'analyst':
    case 'chart':
      return <BarChart3 size={size} className={className} />;
    case '🗣️':
    case '🌐':
    case 'language':
      return <Languages size={size} className={className} />;
    case '🛡️':
    case '⚔️':
    case 'steadfast':
    case 'shield':
      return <Shield size={size} className={className} />;
    case '⚖️':
    case 'scale':
      return <Scale size={size} className={className} />;
    case '🚀':
    case 'rocket':
      return <Rocket size={size} className={className} />;
    case '📈':
    case 'trending':
      return <TrendingUp size={size} className={className} />;
    case '🎨':
    case 'palette':
      return <Palette size={size} className={className} />;
    case '💰':
    case 'coins':
      return <Coins size={size} className={className} />;
    case '🏥':
    case 'medical':
      return <Stethoscope size={size} className={className} />;
    case '🔬':
    case '🧐':
    case 'research':
    case 'microscope':
      return <Microscope size={size} className={className} />;
    case '🎓':
    case '🦉':
    case 'scholarship':
    case 'grad':
      return <GraduationCap size={size} className={className} />;
    case '🤖':
    case 'bot':
      return <Bot size={size} className={className} />;
    case '⚡':
    case 'zap':
      return <Zap size={size} className={className} />;
    case '💎':
    case 'gem':
      return <Gem size={size} className={className} />;
    case '🧠':
    case '🔮':
    case 'brain':
      return <Brain size={size} className={className} />;
    case '🎯':
    case 'target':
      return <Target size={size} className={className} />;
    case '🧭':
    case '🗺️':
    case 'compass':
      return <Compass size={size} className={className} />;
    case '📁':
    case '📂':
    case 'folder':
      return <Folder size={size} className={className} />;
    case '📄':
    case 'doc':
      return <FileText size={size} className={className} />;
    case '📓':
    case 'note':
      return <Notebook size={size} className={className} />;
    case '🏛️':
    case '🏗️':
    case 'landmark':
      return <Landmark size={size} className={className} />;
    case '🌿':
    case 'leaf':
      return <Leaf size={size} className={className} />;
    case '⚙️':
    case 'settings':
      return <Settings size={size} className={className} />;
    case '💡':
    case 'lightbulb':
      return <Lightbulb size={size} className={className} />;
    case '✓':
    case '🎉':
    case 'check':
      return <CheckCircle2 size={size} className={className} />;
    case 'cpu':
      return <Cpu size={size} className={className} />;
    case 'layers':
      return <Layers size={size} className={className} />;
    case 'award':
      return <Award size={size} className={className} />;
    case 'book':
      return <BookOpen size={size} className={className} />;
    case 'terminal':
      return <Terminal size={size} className={className} />;
    case 'flame':
      return <Flame size={size} className={className} />;
    case 'globe':
      return <Globe size={size} className={className} />;
    default:
      return <Sparkles size={size} className={className} />;
  }
};

export default VectorIcon;
