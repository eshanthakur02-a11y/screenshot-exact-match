import { describe, expect, it } from "vitest";
import { documentExtractionSchema, reminderPreferencesSchema, weeklyInsightSchema, taskInputSchema } from "./task-schema";
import { weeklyMetrics } from "./weekly-metrics";
import type { Tables } from "@/integrations/supabase/types";

const task = (patch: Partial<Tables<"tasks">>): Tables<"tasks"> => ({ id:"00000000-0000-4000-8000-000000000001",user_id:"owner",title:"Recorded task",description:null,priority:"medium",status:"todo",due_date:null,estimated_minutes:null,source:"manual",completed_at:null,created_at:"2026-10-20T00:00:00Z",updated_at:"2026-10-20T00:00:00Z",project_id:null,goal_id:null,import_key:null,...patch });
describe("weekly review calculations",()=>{
  it("counts real period completions and project progress",()=>{
    const m=weeklyMetrics([task({status:"done",completed_at:"2026-10-27T00:00:00Z",project_id:"project"}),task({status:"in_progress",due_date:"2026-10-25T12:00:00Z"})],[],"2026-10-26","UTC");
    expect(m.completed).toBe(1);expect(m.completionRate).toBe(50);expect(m.progressedProjects).toEqual(["project"]);expect(m.carriedOver).toBe(1);expect(m.overdue).toBe(1);
  });
  it("uses timezone for period completion boundary",()=>{
    const tasks=[task({status:"done",completed_at:"2026-10-25T20:00:00Z"})];
    expect(weeklyMetrics(tasks,[],"2026-10-26","Asia/Colombo").completed).toBe(1);
    expect(weeklyMetrics(tasks,[],"2026-10-26","UTC").completed).toBe(0);
  });
  it("does not label the period-end deadline overdue before that date has passed",()=>{
    expect(weeklyMetrics([task({due_date:"2026-11-01T12:00:00Z"})],[],"2026-10-26","UTC").overdue).toBe(0);
  });
});
describe("structured insight and document validation",()=>{
  const review={accomplishments:[],blockers:[],goal_progress:[],patterns:[],next_priorities:["a","b","c"],follow_up:[]};
  it("requires exactly three weekly priorities",()=>{expect(weeklyInsightSchema.safeParse(review).success).toBe(true);expect(weeklyInsightSchema.safeParse({...review,next_priorities:["a","b"]}).success).toBe(false);});
  const item={title:"Send notes",description:null,responsible_person:null,due_date:null,priority:null,project_id:null,goal_id:null,evidence:"Send the notes",uncertainties:[]};
  it("allows unknown owners and dates but requires source evidence",()=>{expect(documentExtractionSchema.safeParse({items:[item]}).success).toBe(true);expect(documentExtractionSchema.safeParse({items:[{...item,evidence:""}]}).success).toBe(false);});
  it("rejects invented enum values and invalid dates",()=>{expect(documentExtractionSchema.safeParse({items:[{...item,priority:"critical"}]}).success).toBe(false);expect(documentExtractionSchema.safeParse({items:[{...item,due_date:"tomorrow"}]}).success).toBe(false);});
  it("limits extraction to thirty items",()=>{expect(documentExtractionSchema.safeParse({items:Array(31).fill(item)}).success).toBe(false);});
  it("validates stable document import indices",()=>{expect(taskInputSchema.safeParse({title:"x",document_import:{document_id:"00000000-0000-4000-8000-000000000001",index:30}}).success).toBe(false);});
});
describe("reminder preferences",()=>{it("accepts zero through seven days only",()=>{expect(reminderPreferencesSchema.safeParse({enabled:true,days_before:0}).success).toBe(true);expect(reminderPreferencesSchema.safeParse({enabled:true,days_before:7}).success).toBe(true);expect(reminderPreferencesSchema.safeParse({enabled:true,days_before:8}).success).toBe(false);});});