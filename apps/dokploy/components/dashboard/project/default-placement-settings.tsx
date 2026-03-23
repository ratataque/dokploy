import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { NetworkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { placementFormSchema } from "@/components/dashboard/application/advanced/cluster/swarm-forms/placement-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";

interface DefaultPlacementSettingsProps {
	projectId: string;
	children?: React.ReactNode;
}

export const DefaultPlacementSettings = ({
	projectId,
	children,
}: DefaultPlacementSettingsProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const utils = api.useUtils();
	const [isLoading, setIsLoading] = useState(false);

	const { data, refetch } = api.project.one.useQuery(
		{ projectId },
		{ enabled: !!projectId && isOpen },
	);

	const { mutateAsync } = api.project.update.useMutation();

	const form = useForm<z.infer<typeof placementFormSchema>>({
		resolver: zodResolver(placementFormSchema),
		defaultValues: {
			Constraints: [],
			Preferences: [],
			MaxReplicas: undefined,
			Platforms: [],
		},
	});

	const constraints = form.watch("Constraints") || [];
	const preferences = form.watch("Preferences") || [];
	const platforms = form.watch("Platforms") || [];

	useEffect(() => {
		if (data?.defaultPlacementSwarm) {
			const placement = data.defaultPlacementSwarm;
			form.reset({
				Constraints: placement.Constraints || [],
				Preferences:
					placement.Preferences?.map((p: any) => ({
						SpreadDescriptor: p.Spread?.SpreadDescriptor || "",
					})) || [],
				MaxReplicas: placement.MaxReplicas ?? undefined,
				Platforms: placement.Platforms || [],
			});
		} else if (data && !data.defaultPlacementSwarm) {
			form.reset({
				Constraints: [],
				Preferences: [],
				MaxReplicas: undefined,
				Platforms: [],
			});
		}
	}, [data, form, isOpen]);

	const onSubmit = async (formData: z.infer<typeof placementFormSchema>) => {
		setIsLoading(true);
		try {
			const hasAnyValue =
				(formData.Constraints && formData.Constraints.length > 0) ||
				(formData.Preferences && formData.Preferences.length > 0) ||
				(formData.Platforms && formData.Platforms.length > 0) ||
				formData.MaxReplicas !== undefined;

			await mutateAsync({
				projectId,
				defaultPlacementSwarm: hasAnyValue
					? {
							...formData,
							Preferences: formData.Preferences?.map((p) => ({
								Spread: { SpreadDescriptor: p.SpreadDescriptor },
							})),
						}
					: null,
			});

			toast.success("Default placement updated successfully");
			utils.project.one.invalidate({ projectId });
			setIsOpen(false);
		} catch {
			toast.error("Error updating default placement");
		} finally {
			setIsLoading(false);
		}
	};

	const addConstraint = () => {
		form.setValue("Constraints", [...constraints, ""]);
	};

	const updateConstraint = (index: number, value: string) => {
		const newConstraints = [...constraints];
		newConstraints[index] = value;
		form.setValue("Constraints", newConstraints);
	};

	const removeConstraint = (index: number) => {
		form.setValue(
			"Constraints",
			constraints.filter((_: string, i: number) => i !== index),
		);
	};

	const addPreference = () => {
		form.setValue("Preferences", [...preferences, { SpreadDescriptor: "" }]);
	};

	const updatePreference = (index: number, value: string) => {
		const newPreferences = [...preferences];
		if (newPreferences[index]) {
			newPreferences[index].SpreadDescriptor = value;
			form.setValue("Preferences", newPreferences);
		}
	};

	const removePreference = (index: number) => {
		form.setValue(
			"Preferences",
			preferences.filter((_: any, i: number) => i !== index),
		);
	};

	const addPlatform = () => {
		form.setValue("Platforms", [...platforms, { Architecture: "", OS: "" }]);
	};

	const updatePlatform = (
		index: number,
		field: "Architecture" | "OS",
		value: string,
	) => {
		const newPlatforms = [...platforms];
		if (newPlatforms[index]) {
			newPlatforms[index][field] = value;
			form.setValue("Platforms", newPlatforms);
		}
	};

	const removePlatform = (index: number) => {
		form.setValue(
			"Platforms",
			platforms.filter((_: any, i: number) => i !== index),
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{children ?? (
					<Button variant="outline" className="w-full cursor-pointer space-x-3">
						<NetworkIcon className="size-4" />
						<span>Default Swarm Placement</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-screen overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Default Swarm Placement</DialogTitle>
					<DialogDescription>
						These defaults apply to all services in this project unless
						overridden per-service.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 pt-4"
					>
						<div>
							<FormLabel>Constraints</FormLabel>
							<FormDescription>
								Placement constraints (e.g., "node.role==manager")
							</FormDescription>
							<div className="space-y-2 mt-2">
								{constraints.map((constraint: string, index: number) => (
									<div key={index} className="flex gap-2">
										<Input
											value={constraint}
											onChange={(e) => updateConstraint(index, e.target.value)}
											placeholder="node.role==manager"
										/>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => removeConstraint(index)}
										>
											Remove
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addConstraint}
								>
									Add Constraint
								</Button>
							</div>
						</div>

						<div>
							<FormLabel>Preferences</FormLabel>
							<FormDescription>
								Spread preferences for task distribution (e.g.,
								"node.labels.region")
							</FormDescription>
							<div className="space-y-2 mt-2">
								{preferences.map((pref: any, index: number) => (
									<div key={index} className="flex gap-2">
										<Input
											value={pref.SpreadDescriptor}
											onChange={(e) => updatePreference(index, e.target.value)}
											placeholder="node.labels.region"
										/>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => removePreference(index)}
										>
											Remove
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addPreference}
								>
									Add Preference
								</Button>
							</div>
						</div>

						<FormField
							control={form.control}
							name="MaxReplicas"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Max Replicas</FormLabel>
									<FormDescription>
										Maximum number of replicas per node
									</FormDescription>
									<FormControl>
										<Input type="number" placeholder="10" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div>
							<FormLabel>Platforms</FormLabel>
							<FormDescription>
								Target platforms for task scheduling
							</FormDescription>
							<div className="space-y-2 mt-2">
								{platforms.map((platform: any, index: number) => (
									<div key={index} className="flex gap-2">
										<Input
											value={platform.Architecture}
											onChange={(e) =>
												updatePlatform(index, "Architecture", e.target.value)
											}
											placeholder="amd64"
										/>
										<Input
											value={platform.OS}
											onChange={(e) =>
												updatePlatform(index, "OS", e.target.value)
											}
											placeholder="linux"
										/>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => removePlatform(index)}
										>
											Remove
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addPlatform}
								>
									Add Platform
								</Button>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.reset({
										Constraints: [],
										Preferences: [],
										MaxReplicas: undefined,
										Platforms: [],
									});
								}}
							>
								Clear
							</Button>
							<Button type="submit" isLoading={isLoading}>
								Save Default Placement
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
