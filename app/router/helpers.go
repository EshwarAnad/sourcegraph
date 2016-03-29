package router

import (
	"fmt"
	"net/url"

	"sourcegraph.com/sourcegraph/sourcegraph/pkg/vcs"

	"sourcegraph.com/sourcegraph/sourcegraph/go-sourcegraph/sourcegraph"
	"sourcegraph.com/sourcegraph/srclib/graph"
)

func (r *Router) URLToUserSubroute(routeName string, userSpec string) *url.URL {
	return r.URLTo(routeName, "User", userSpec)
}

func (r *Router) URLToRepo(uri string) *url.URL {
	return r.URLToRepoSubroute(Repo, uri)
}

func (r *Router) URLToGitHubOAuth() *url.URL {
	return r.URLTo(GitHubOAuth2Initiate)
}

func (r *Router) URLToRepoRev(repoURI string, rev string) (*url.URL, error) {
	return r.URLToRepoSubrouteRev(Repo, repoURI, rev)
}

func (r *Router) URLToRepoBuild(repo string, build uint64) *url.URL {
	return r.URLToRepoBuildSubroute(RepoBuild, repo, build)
}

func (r *Router) URLToRepoBuildSubroute(routeName string, repo string, build uint64) *url.URL {
	return r.URLTo(routeName, "Repo", repo, "Build", fmt.Sprint(build))
}

func (r *Router) URLToRepoBuildTaskSubroute(routeName string, repo string, build, task uint64) *url.URL {
	return r.URLTo(routeName, "Repo", repo, "Build", fmt.Sprint(build), "Task", fmt.Sprint(task))
}

func (r *Router) URLToRepoSubroute(routeName string, uri string) *url.URL {
	return r.URLTo(routeName, "Repo", uri)
}

func (r *Router) URLToRepoSubrouteRev(routeName string, repoURI string, rev string) (*url.URL, error) {
	return r.URLToOrError(routeName, "Repo", repoURI, "Rev", rev)
}

func (r *Router) URLToRepoTreeEntry(repoURI string, rev interface{}, path string) *url.URL {
	return r.URLToRepoTreeEntrySubroute(RepoTree, repoURI, commitIDStr(rev), path)
}

func (r *Router) URLToRepoTreeEntryRaw(repoURI string, rev, path string) *url.URL {
	u := r.URLToRepoTreeEntrySubroute(RepoTree, repoURI, commitIDStr(rev), path)
	u.RawQuery = "raw"
	return u
}

// IsRaw returns true if u is a URL to a tree entry generated by
// URLToRepoTreeEntryRaw. The file should be displayed raw instead of
// being rendered (e.g., as Markdown).
func IsRaw(u *url.URL) bool {
	_, raw := u.Query()["raw"]
	return raw
}

func (r *Router) URLToRepoTreeEntrySubroute(routeName string, repo string, rev interface{}, path string) *url.URL {
	return r.URLTo(routeName, "Repo", repo, "Rev", commitIDStr(rev), "Path", path)
}

func (r *Router) URLToRepoTreeEntrySpec(e sourcegraph.TreeEntrySpec) *url.URL {
	return r.URLTo(RepoTree, "Repo", e.RepoRev.RepoSpec.SpecString(), "Rev", e.RepoRev.ResolvedRevString(), "Path", e.Path)
}

func (r *Router) URLToRepoTreeEntryLines(repoURI string, rev, path string, startLine int) *url.URL {
	u := r.URLTo(RepoTree, "Repo", repoURI, "Rev", rev, "Path", path)
	u.Fragment = fmt.Sprintf("L%d", startLine)
	return u
}

func (r *Router) URLToDef(key graph.DefKey) *url.URL {
	return r.URLToDefSubroute(Def, key)
}

func (r *Router) URLToDefSubroute(routeName string, key graph.DefKey) *url.URL {
	return r.URLTo(routeName, "Repo", string(key.Repo), "UnitType", key.UnitType, "Unit", key.Unit, "Path", string(key.Path))
}

func (r *Router) URLToDefAtRev(key graph.DefKey, rev interface{}) *url.URL {
	return r.URLToDefAtRevSubroute(Def, key, rev)
}

func (r *Router) URLToDefAtRevSubroute(routeName string, key graph.DefKey, rev interface{}) *url.URL {
	return r.URLTo(routeName, "Repo", string(key.Repo), "Rev", commitIDStr(rev), "UnitType", key.UnitType, "Unit", key.Unit, "Path", string(key.Path))
}

func (r *Router) URLToRepoCommit(repoURI string, commitID interface{}) *url.URL {
	return r.URLTo("repo.commit", "Repo", repoURI, "Rev", commitIDStr(commitID))
}

func commitIDStr(commitID interface{}) string {
	if v, ok := commitID.(vcs.CommitID); ok {
		return string(v)
	}
	return commitID.(string)
}
