import { NetworkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

interface SwarmNodeOption {
	ID: string;
	Hostname: string;
}

interface PlacementState {
	automatic: boolean;
	selectedNodeIds: string[];
	hasCustomConstraints: boolean;
}

const getConstraintForNode = (node: SwarmNodeOption) =>
	`node.hostname==${node.Hostname}`;

const parsePlacementState = (
	constraints: string[] | undefined | null,
	nodes: SwarmNodeOption[],
): PlacementState => {
	const list = constraints?.filter(Boolean) ?? [];
	if (list.length === 0) {
		return {
			automatic: true,
			selectedNodeIds: [],
			hasCustomConstraints: false,
		};
	}

	const byConstraint = new Map(
		nodes.map((node) => [getConstraintForNode(node), node.ID]),
	);
	const selectedNodeIds = list
		.map((constraint) => byConstraint.get(constraint))
		.filter((value): value is string => Boolean(value));

	return {
		automatic: false,
		selectedNodeIds,
		hasCustomConstraints: selectedNodeIds.length !== list.length,
	};
};

const mapNodeIdsToConstraints = (
	nodeIds: string[],
	nodes: SwarmNodeOption[],
) => {
	const byId = new Map(nodes.map((node) => [node.ID, node]));
	return nodeIds
		.map((id) => byId.get(id))
		.filter((node): node is SwarmNodeOption => Boolean(node))
		.map((node) => getConstraintForNode(node));
};

const toggleNode = (nodeId: string, selectedNodeIds: string[]) => {
	if (selectedNodeIds.includes(nodeId)) {
		return selectedNodeIds.filter((id) => id !== nodeId);
	}
	return [...selectedNodeIds, nodeId];
};

interface PlacementSelectorProps {
	title: string;
	description: string;
	nodes: SwarmNodeOption[];
	automatic: boolean;
	selectedNodeIds: string[];
	hasCustomConstraints?: boolean;
	onAutomatic: () => void;
	onToggleNode: (nodeId: string) => void;
}

const PlacementSelector = ({
	title,
	description,
	nodes,
	automatic,
	selectedNodeIds,
	hasCustomConstraints,
	onAutomatic,
	onToggleNode,
}: PlacementSelectorProps) => {
	return (
		<div className="space-y-3 rounded-lg border p-4">
			<div className="space-y-1">
				<h4 className="text-sm font-medium">{title}</h4>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>

			{hasCustomConstraints && (
				<AlertBlock type="warning">
					Existing non-node placement constraints detected. Saving will replace
					them with the selected options below.
				</AlertBlock>
			)}

			<div className="space-y-2">
				<button
					type="button"
					className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted"
					onClick={onAutomatic}
				>
					<div className="flex items-center justify-between">
						<span className="font-medium">Automatic</span>
						{automatic && <Badge variant="green">Selected</Badge>}
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Tasks are distributed across all available nodes (default swarm
						behavior).
					</p>
				</button>

				<div className="space-y-2">
					<Label>Nodes</Label>
					{nodes.length === 0 ? (
						<p className="text-sm text-muted-foreground">No nodes available</p>
					) : (
						<div className="grid gap-2 md:grid-cols-2">
							{nodes.map((node) => {
								const selected =
									!automatic && selectedNodeIds.includes(node.ID);
								return (
									<button
										type="button"
										key={node.ID}
										className="w-full rounded-md border p-2.5 text-left transition-colors hover:bg-muted"
										onClick={() => onToggleNode(node.ID)}
									>
										<div className="flex items-center justify-between">
											<span className="text-sm">{node.Hostname}</span>
											{selected && <Badge variant="blue">Selected</Badge>}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

interface SwarmDefaultsSettingsProps {
	nodes: SwarmNodeOption[];
}

export const SwarmDefaultsSettings = ({
	nodes,
}: SwarmDefaultsSettingsProps) => {
	const [open, setOpen] = useState(false);
	const [globalAutomatic, setGlobalAutomatic] = useState(true);
	const [globalSelectedNodeIds, setGlobalSelectedNodeIds] = useState<string[]>(
		[],
	);
	const [globalHasCustomConstraints, setGlobalHasCustomConstraints] =
		useState(false);

	const [selectedProjectId, setSelectedProjectId] = useState<string>("");
	const [projectAutomatic, setProjectAutomatic] = useState(true);
	const [projectSelectedNodeIds, setProjectSelectedNodeIds] = useState<
		string[]
	>([]);
	const [projectHasCustomConstraints, setProjectHasCustomConstraints] =
		useState(false);

	const { data: projects } = api.project.all.useQuery(undefined, {
		enabled: open,
	});
	const { data: globalDefaults, refetch: refetchGlobalDefaults } =
		api.settings.getSwarmDefaults.useQuery(undefined, { enabled: open });
	const { data: selectedProjectData, refetch: refetchSelectedProject } =
		api.project.one.useQuery(
			{ projectId: selectedProjectId },
			{ enabled: open && !!selectedProjectId },
		);

	const { mutateAsync: updateSwarmDefaults, isPending: isSavingGlobal } =
		api.settings.updateSwarmDefaults.useMutation();
	const { mutateAsync: updateProject, isPending: isSavingProject } =
		api.project.update.useMutation();

	useEffect(() => {
		if (!open) return;
		if (!selectedProjectId && projects && projects.length > 0) {
			setSelectedProjectId(projects[0]?.projectId ?? "");
		}
	}, [open, projects, selectedProjectId]);

	useEffect(() => {
		if (!open || !globalDefaults) return;
		const placement = parsePlacementState(
			globalDefaults.placementConstraints,
			nodes,
		);
		setGlobalAutomatic(placement.automatic);
		setGlobalSelectedNodeIds(placement.selectedNodeIds);
		setGlobalHasCustomConstraints(placement.hasCustomConstraints);
	}, [open, globalDefaults, nodes]);

	useEffect(() => {
		if (!open || !selectedProjectData) return;
		const placement = parsePlacementState(
			selectedProjectData.defaultPlacementSwarm?.Constraints,
			nodes,
		);
		setProjectAutomatic(placement.automatic);
		setProjectSelectedNodeIds(placement.selectedNodeIds);
		setProjectHasCustomConstraints(placement.hasCustomConstraints);
	}, [open, selectedProjectData, nodes]);

	const orderedProjects = useMemo(
		() =>
			[...(projects ?? [])].sort((a, b) =>
				a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
			),
		[projects],
	);

	const saveGlobalDefaults = async () => {
		const placementConstraints = globalAutomatic
			? []
			: mapNodeIdsToConstraints(globalSelectedNodeIds, nodes);
		await updateSwarmDefaults({ placementConstraints })
			.then(async () => {
				toast.success("Swarm defaults updated");
				await refetchGlobalDefaults();
			})
			.catch(() => {
				toast.error("Error updating swarm defaults");
			});
	};

	const saveProjectDefaults = async () => {
		if (!selectedProjectId) return;
		const placementConstraints = projectAutomatic
			? []
			: mapNodeIdsToConstraints(projectSelectedNodeIds, nodes);

		await updateProject({
			projectId: selectedProjectId,
			defaultPlacementSwarm: {
				Constraints: placementConstraints,
			},
		})
			.then(async () => {
				toast.success("Project defaults updated");
				await refetchSelectedProject();
			})
			.catch(() => {
				toast.error("Error updating project defaults");
			});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<NetworkIcon className="mr-2 size-4" />
					Swarm Defaults
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Swarm Defaults</DialogTitle>
					<DialogDescription>
						Set default swarm placement for all services. You can also override
						placement per project.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<PlacementSelector
						title="Global Defaults"
						description="Default placement applied platform-wide when service and project constraints are not defined."
						nodes={nodes}
						automatic={globalAutomatic}
						selectedNodeIds={globalSelectedNodeIds}
						hasCustomConstraints={globalHasCustomConstraints}
						onAutomatic={() => {
							setGlobalAutomatic(true);
							setGlobalSelectedNodeIds([]);
						}}
						onToggleNode={(nodeId) => {
							setGlobalAutomatic(false);
							setGlobalSelectedNodeIds((current) =>
								toggleNode(nodeId, current),
							);
						}}
					/>
					<div className="flex justify-end">
						<Button onClick={saveGlobalDefaults} isLoading={isSavingGlobal}>
							Save Swarm Defaults
						</Button>
					</div>

					<div className="space-y-3 rounded-lg border p-4">
						<div className="space-y-1">
							<h4 className="text-sm font-medium">Project Defaults</h4>
							<p className="text-xs text-muted-foreground">
								Override placement defaults for one project.
							</p>
						</div>

						<div className="space-y-2">
							<Label>Project</Label>
							<Select
								value={selectedProjectId}
								onValueChange={setSelectedProjectId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select project" />
								</SelectTrigger>
								<SelectContent>
									{orderedProjects.map((project) => (
										<SelectItem
											key={project.projectId}
											value={project.projectId}
										>
											{project.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{selectedProjectId && (
							<>
								<PlacementSelector
									title="Placement Constraints"
									description="Use Automatic or select one or more nodes for this project."
									nodes={nodes}
									automatic={projectAutomatic}
									selectedNodeIds={projectSelectedNodeIds}
									hasCustomConstraints={projectHasCustomConstraints}
									onAutomatic={() => {
										setProjectAutomatic(true);
										setProjectSelectedNodeIds([]);
									}}
									onToggleNode={(nodeId) => {
										setProjectAutomatic(false);
										setProjectSelectedNodeIds((current) =>
											toggleNode(nodeId, current),
										);
									}}
								/>
								<div className="flex justify-end">
									<Button
										variant="secondary"
										onClick={saveProjectDefaults}
										isLoading={isSavingProject}
									>
										Save Project Defaults
									</Button>
								</div>
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
