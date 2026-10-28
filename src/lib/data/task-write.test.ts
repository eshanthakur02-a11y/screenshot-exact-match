import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkTaskLinks, saveTaskRow } from "./task-write.server";

function fakeDb(results: unknown[]) {
  const insert=vi.fn();
  const q={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),single:vi.fn(),insert};
  q.select.mockReturnValue(q);q.eq.mockReturnValue(q);insert.mockReturnValue(q);
  q.maybeSingle.mockImplementation(async()=>results.shift());q.single.mockImplementation(async()=>results.shift());
  return {db:{from:vi.fn(()=>q)} as unknown as SupabaseClient<Database>,q};
}
describe("owned task writes",()=>{
  it("rejects an inaccessible project before writing",async()=>{
    const {db,q}=fakeDb([{data:null,error:null}]);
    await expect(checkTaskLinks(db,"owner",{project_id:"other-project"})).rejects.toThrow("unavailable");
    expect(q.eq).toHaveBeenCalledWith("user_id","owner");expect(q.insert).not.toHaveBeenCalled();
  });
  it("reports a database failure instead of returning success",async()=>{
    const {db}=fakeDb([{data:null,error:{code:"failure"}}]);
    await expect(saveTaskRow(db,"owner",{title:"Confirmed task"})).rejects.toThrow("could not be saved");
  });
  it("returns the existing imported row without inserting a duplicate",async()=>{
    const item={title:"Source task",description:null,responsible_person:null,due_date:null,priority:null,project_id:null,goal_id:null,evidence:"Source task",uncertainties:[]};
    const docId="00000000-0000-4000-8000-000000000001";
    const saved={id:"real-row",title:"Previously saved edit"};
    const {db,q}=fakeDb([{data:{id:docId,candidates:{items:[item]}},error:null},{data:saved,error:null}]);
    expect(await saveTaskRow(db,"owner",{title:"Source task",document_import:{document_id:docId,index:0}})).toEqual(saved);
    expect(q.insert).not.toHaveBeenCalled();expect(q.eq).toHaveBeenCalledWith("import_key",`${docId}:0`);
  });
  it("rejects an unavailable document source",async()=>{
    const {db,q}=fakeDb([{data:null,error:null}]);
    await expect(saveTaskRow(db,"owner",{title:"Task",document_import:{document_id:"00000000-0000-4000-8000-000000000001",index:0}})).rejects.toThrow("unavailable");
    expect(q.insert).not.toHaveBeenCalled();
  });
});