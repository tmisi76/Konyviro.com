export interface StoryProtagonist {
  name: string;
  age?: string;
  description: string;
  innerConflict: string;
  arc: string;
}

export interface StoryAntagonist {
  name: string;
  description: string;
}

export interface PlotPoint {
  beat: string;
  description: string;
}

export interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
}

export interface GeneratedStory {
  title: string;
  logline: string;
  synopsis: string;
  protagonist: StoryProtagonist;
  antagonist: StoryAntagonist;
  setting: string;
  themes: string[];
  plotPoints: PlotPoint[];
  chapters: ChapterOutline[];
}

export interface StoryStructure {
  protagonist?: StoryProtagonist;
  antagonist?: StoryAntagonist;
  setting?: string;
  themes?: string[];
  plotPoints?: PlotPoint[];
  chapters?: ChapterOutline[];
}
