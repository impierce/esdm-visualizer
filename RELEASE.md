# Releasing to Docker Hub

Releases can be built and pushed with GitHub Actions or locally. Both paths run
`release.sh`, and each image receives two tags:

- `sha-` followed by the first seven characters of the Git commit hash.
- `latest`, which moves to the most recently published release.

Git-hash tags are immutable by convention. Docker Hub does not prevent
overwriting them, so never reuse a hash tag for different image contents.

## GitHub Actions

The `Release Docker image` workflow can be started manually from the repository's
Actions tab. Before running it, configure these under **Settings → Secrets and
variables → Actions**:

- Variable `DOCKERHUB_USERNAME`: the Docker Hub account name.
- Secret `DOCKERHUB_TOKEN`: a Docker Hub personal access token with push access
  to `impierce/esdm-visualizer`.

Choose the commit or branch to release when starting the workflow. GitHub checks
out that revision and runs `release.sh`, so the published `sha-` tag corresponds
to the selected commit.

GitHub serializes release runs to avoid two jobs racing to update `latest`.

## Local release

## Prerequisites

- Docker Desktop or Docker Engine with Buildx
- Push access to `impierce/esdm-visualizer` on Docker Hub
- A clean Git working tree

## 1. Commit the release

Commit every change that should be included in the image. Building from a dirty
working tree would make the Git tag misrepresent the image contents.

```shell
git status
git add .
git commit -m "feat: a meaningful message"
```

## 2. Sign in to Docker Hub

```shell
docker login
```

Docker Hub uses a browser-based device flow by default. A personal access token
can also be used when signing in with a username.

## 3. Create a multi-platform builder

The default `docker` driver may not support multi-platform builds when Docker
uses its classic image store. Create a dedicated BuildKit container once:

```shell
docker buildx create \
  --name esdm-builder \
  --driver docker-container \
  --bootstrap \
  --use
```

If the builder already exists, select and start it instead:

```shell
docker buildx use esdm-builder
docker buildx inspect --bootstrap
```

The builder persists between releases, so this setup does not need to be
repeated.

## 4. Build and push

Run the release script from the repository root:

```shell
./release.sh
```

Define the published image and commit tag for the verification steps below:

```shell
IMAGE=docker.io/impierce/esdm-visualizer
GIT_SHA="sha-$(git rev-parse HEAD | cut -c1-7)"
```

This publishes the same multi-platform image as:

```text
impierce/esdm-visualizer:sha-<first-seven-hash-characters>
impierce/esdm-visualizer:latest
```

## 5. Verify the published image

```shell
docker buildx imagetools inspect "${IMAGE}:${GIT_SHA}"
docker buildx imagetools inspect "${IMAGE}:latest"
```

Both tags should describe the same platforms and image digest.

## 6. Test the published image

The domain model is not included in the image. Mount one at `/data` when
starting the container:

```shell
docker run --rm \
  -p 3000:3000 \
  -v "$PWD/examples/shop:/data:ro" \
  "${IMAGE}:${GIT_SHA}"
```

Open <http://localhost:3000>.

## Subsequent releases

For every release:

1. Commit all intended changes.
2. Run `./release.sh` again, locally or through the GitHub Actions workflow.

The new Git hash creates a new release tag, while `latest` moves to the same
image.

## References

- [Docker login](https://docs.docker.com/reference/cli/docker/login/)
- [Docker Buildx build](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Hub image tags](https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/)
