import { Transition } from '@headlessui/react';
import { Form, Head, Link, router, useForm, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit(),
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;

    const avatarForm = useForm<{
        avatar: File | null;
    }>({
        avatar: null,
    });

    const avatarPreview = avatarForm.data.avatar
        ? URL.createObjectURL(avatarForm.data.avatar)
        : auth.user.avatar_url;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();

                            avatarForm.post('/settings/profile/avatar', {
                                forceFormData: true,
                                preserveScroll: true,
                                onSuccess: () => {
                                    avatarForm.reset('avatar');
                                },
                            });
                        }}
                        className="space-y-4 rounded-xl border p-4"
                    >
                        <div>
                            <div className="text-sm font-medium">
                                Profile picture
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Upload a JPG, PNG, or WebP image up to 2 MB.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt={auth.user.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xl font-semibold">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div className="grid flex-1 gap-2">
                                <Input
                                    id="avatar"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        avatarForm.setData(
                                            'avatar',
                                            e.target.files?.[0] ?? null
                                        );
                                    }}
                                />

                                {avatarForm.errors.avatar && (
                                    <InputError message={avatarForm.errors.avatar} />
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={avatarForm.processing || !avatarForm.data.avatar}
                                    >
                                        {avatarForm.processing ? 'Uploading...' : 'Change profile picture'}
                                    </Button>

                                    {auth.user.avatar_url && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                if (!confirm('Remove your profile picture?')) {
                                                    return;
                                                }

                                                router.delete('/settings/profile/avatar', {
                                                    preserveScroll: true,
                                                });
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>    

                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name and email address"
                    />                

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="temperature_unit">
                                        Temperature unit
                                    </Label>

                                    <select
                                        id="temperature_unit"
                                        name="temperature_unit"
                                        defaultValue={auth.user.temperature_unit ?? 'celsius'}
                                        className="
                                            mt-1
                                            block
                                            w-full
                                            rounded-md
                                            border
                                            border-input
                                            bg-background
                                            px-3
                                            py-2
                                            text-sm
                                            shadow-sm
                                        "
                                    >
                                        <option value="celsius">
                                            Celsius °C
                                        </option>

                                        <option value="fahrenheit">
                                            Fahrenheit °F
                                        </option>
                                    </select>

                                    <p className="text-sm text-muted-foreground">
                                        BBT values are stored internally in Celsius for accurate analysis.
                                    </p>

                                    <InputError
                                        className="mt-2"
                                        message={errors.temperature_unit}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
