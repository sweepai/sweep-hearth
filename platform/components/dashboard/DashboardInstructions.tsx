import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Label } from "@radix-ui/react-label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../ui/popover"
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import React from "react";
import { getFile, writeFile } from "../../lib/api.service";
import { Snippet } from "../../lib/search";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsContent } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { FileChangeRequest } from "../../lib/types";
import { FaPlay } from "react-icons/fa";
import { FaArrowsRotate, FaCheck } from "react-icons/fa6";
import { toast } from "sonner";

const testCasePlaceholder = `Example:
1. Modify the class name to be something more descriptive
2. Add a print statement to the front of each function to describe what each function does.`;

const instructionsPlaceholder = `Example: add a docstring after each function definition describing what it does.`;

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DashboardInstructions = ({
  filePath,
  repoName,
  setSnippets,
  open,
  setOpen,
  files,
  instructions,
  setInstructions,
  fileChangeRequests,
  setFileChangeRequests,
  currentFileChangeRequestIndex,
  setCurrentFileChangeRequestIndex,
  setFileByIndex,
  setOldFileByIndex,
  setHideMerge,
  getFileChanges
}: any) => {
  const getDynamicClassNames = (fcr: FileChangeRequest, index: number) => {
    let classNames = "";
    if (index === currentFileChangeRequestIndex) { // current selected fcr
      classNames += " font-extrabold text-white ";
    } else {
      classNames += " text-zinc-300 ";
    }
    // background highlighting
    if (fcr.isLoading) { // is being generated
      classNames += " bg-orange-900 ";
    } else if (!fcr.hideMerge && !fcr.isLoading) { // has completed generation
      classNames += " bg-green-900 ";
    }
    else { // default
      classNames += " bg-zinc-900 ";
    }
    return classNames
  }

  return (
    <Tabs defaultValue="plan" className="grow overflow-auto mb-4 h-full">
      <TabsContent value="plan" className="h-full">
        <div className="grow border rounded-md p-4 overflow-auto h-full">
          <Popover open={open} onOpenChange={setOpen}>
            <div className="flex flex-row mb-4">
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between overflow-hidden"
                  disabled={files.length === 0}
                >
                  Add files for Sweep to modify
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
            </div>
            <PopoverContent className="w-full p-0 text-left">
              <Command>
                <CommandInput placeholder="Search file..." className="h-9" />
                <CommandEmpty>No file found.</CommandEmpty>
                <CommandGroup>
                  {files.map((file: any) => (
                    <CommandItem
                      key={file.value}
                      value={file.value}
                      onSelect={async (currentValue) => {
                        // ensure file is not already included
                        if (fileChangeRequests.some((fcr: FileChangeRequest) => fcr.snippet.file === file.value)) {
                          return;
                        }
                        const contents = (await getFile(repoName, file.value))
                          .contents;
                        setFileChangeRequests((prev: FileChangeRequest[]) => {
                          let snippet = {
                            file: file.value,
                            start: 0,
                            end: contents.split("\n").length,
                            entireFile: contents,
                            content: contents, // this is the slice based on start and end, remeber to change this
                          } as Snippet;
                          return [
                            ...prev,
                            {
                              snippet,
                              changeType: "modify",
                              newContents: contents,
                              hideMerge: true,
                              instructions: "",
                              isLoading: false,
                            } as FileChangeRequest,
                          ];
                        });
                        setOpen(false);
                      }}
                    >
                      {file.label}
                      <CheckIcon
                        className={cn(
                          "ml-auto h-4 w-4",
                          filePath === file.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {fileChangeRequests.map(
            (fileChangeRequest: FileChangeRequest, index: number) => (
              <div key={index} className="mb-4 grow"
                onClick={(e) => {
                  setCurrentFileChangeRequestIndex(index)
                }}
              >
                <div className={`flex justify-between p-2 ${getDynamicClassNames(fileChangeRequest, index)} rounded font-sm font-mono items-center`}>
                  <span>
                    {fileChangeRequest.snippet.file.split("/")[fileChangeRequest.snippet.file.split("/").length - 1]}:
                    {fileChangeRequest.snippet.start}-
                    {fileChangeRequest.snippet.end}
                  </span>
                  <span>
                    <Button
                      size="sm"
                      className="mr-2 bg-green-600 hover:bg-green-700 float-right"
                      onClick={async () => {
                        setOldFileByIndex(fileChangeRequest.newContents, index);
                        setHideMerge(true, index);
                        await writeFile(repoName, fileChangeRequest.snippet.file, fileChangeRequest.newContents);
                        toast.success("Succesfully saved file!", {
                          action: { label: "Dismiss", onClick: () => { } }
                        });
                      }}
                      disabled={fileChangeRequest.isLoading || fileChangeRequest.hideMerge}
                    >
                      <FaCheck />
                    </Button>
                    <Button
                      className="mr-2 float-right"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const response = await getFile(repoName, fileChangeRequest.snippet.file);
                        setFileByIndex(response.contents, index);
                        setOldFileByIndex(response.contents, index);
                        toast.success("File synced from storage!", { action: { label: "Dismiss", onClick: () => { } } });
                        setCurrentFileChangeRequestIndex(index)
                        setHideMerge(true, index);
                      }}
                      disabled={fileChangeRequest.isLoading}
                    >
                      <FaArrowsRotate />
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="mr-2 float-right"
                      onClick={(e) => {
                        setCurrentFileChangeRequestIndex(index)
                        getFileChanges(fileChangeRequest, index)
                      }}
                      disabled={fileChangeRequest.isLoading}
                    >
                      <FaPlay />&nbsp;{capitalize(fileChangeRequest.changeType)}
                    </Button>
                  </span>
                </div>
                <Textarea
                  placeholder={instructionsPlaceholder}
                  value={fileChangeRequest.instructions}
                  onClick={(e) => {
                    setCurrentFileChangeRequestIndex(index)
                  }}
                  onChange={(e) => {
                    setFileChangeRequests((prev: FileChangeRequest[]) => [
                      ...prev.slice(0, index),
                      {
                        ...prev[index],
                        instructions: e.target.value,
                      },
                      ...prev.slice(index + 1),
                    ]);
                  }}
                />
              </div>
            ),
          )}
          {fileChangeRequests.length === 0 && (
            <div className="p-2 text-zinc-300">No files added yet.</div>
          )}
        </div>
      </TabsContent>
      <TabsContent className="flex flex-col h-full pt-4" value="modify">
        <div className="grow">
          <Label className="mb-2 font-bold">Instructions</Label>
          <Textarea
            id="instructions-input"
            placeholder={testCasePlaceholder}
            value={instructions}
            className="grow mb-4"
            onChange={(e) => setInstructions(e.target.value)}
            style={{ height: "-webkit-fill-available" }}
          ></Textarea>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <div className="flex flex-row mb-4 p-2">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between overflow-hidden mt-4"
                disabled={!files}
              >
                Add relevant read-only files for Sweep to read
                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-full p-0 text-left">
            <Command>
              <CommandInput placeholder="Search file..." className="h-9" />
              <CommandEmpty>
                <div className="text-zinc-300">
                  No file found.
                </div>
              </CommandEmpty>
              <CommandGroup>
                {files.map((file: any) => (
                  <CommandItem
                    key={file.value}
                    value={file.value}
                    onSelect={async (currentValue) => {
                      const contents = (await getFile(repoName, file.value))
                        .contents;
                      setSnippets((prev: { [key: string]: Snippet }) => {
                        let newSnippet = {
                          file: file.value,
                          start: 0,
                          end: contents.split("\n").length,
                          entireFile: contents,
                          content: contents, // this is the slice based on start and end, remeber to change this
                        } as Snippet;
                        prev[newSnippet.file] = newSnippet;
                        return prev;
                      });
                      setOpen(false);
                    }}
                  >
                    {file.label}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        filePath === file.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </TabsContent>
    </Tabs>
  );
};
export default DashboardInstructions;
