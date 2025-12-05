export interface Topic {
  name: string;
  rating?: number;
  resources?: {
    youtube?: string[];
    readings?: string[];
  };
}

export interface Module {
  module_label: string;
  raw: string;
  topics: string[];
  rating?: number;
  topicsWithRating?: Topic[];
}

export interface Course {
  meta: {
    course_code: string;
    title: string;
    header: string;
  };
  modules: Module[];
}

export interface StudyPlan {
  courseCode: string;
  courseTitle: string;
  modules: {
    moduleLabel: string;
    topics: {
      name: string;
      priority: 'high' | 'medium' | 'low';
      resources: {
        type: 'youtube' | 'reading';
        title: string;
        url: string;
      }[];
    }[];
  }[];
}
